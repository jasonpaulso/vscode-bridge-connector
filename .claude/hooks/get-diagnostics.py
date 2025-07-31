import http.client
import json
import sys
import os
import time

try:
    # Read input from stdin
    input_data = json.load(sys.stdin)
    
    # Extract file path from the appropriate location based on tool
    file_path = None
    if input_data.get("tool_name") == "Write" and "tool_input" in input_data:
        file_path = input_data["tool_input"].get("file_path")
    elif input_data.get("tool_name") == "Edit" and "tool_input" in input_data:
        file_path = input_data["tool_input"].get("file_path")
    elif input_data.get("tool_name") == "MultiEdit" and "tool_input" in input_data:
        file_path = input_data["tool_input"].get("file_path")
    elif "tool_response" in input_data:
        file_path = input_data["tool_response"].get("filePath")
    
    if not file_path:
        # No file path found, exit normally
        sys.exit(0)
    
    # Get API key from environment variable or use default
    api_key = os.environ.get('VSCODE_BRIDGE_API_KEY', 'your-secret-key-here')
    
    # For Write operations, add a small delay to allow VSCode to analyze the file
    if input_data.get("tool_name") == "Write":
        time.sleep(0.5)  # 500ms delay
    
    # Make request to VSCode Bridge Connector API
    conn = http.client.HTTPConnection("localhost", 8282)
    payload = json.dumps({
        "command": "vscode.languages.getDiagnostics",
        "args": [file_path]
    })
    headers = {
        'Content-Type': 'application/json',
        'x-vscode-key': api_key
    }
    
    conn.request("POST", "/command", payload, headers)
    res = conn.getresponse()
    data = res.read()
    
    # Parse response
    response = json.loads(data.decode("utf-8"))
    
    # Check if request was successful
    if not response.get("success", False):
        # API call failed, exit normally
        sys.exit(0)
    
    # Check diagnostics result
    result = response.get("result", [])
    
    if result and len(result) > 0:
        # Diagnostics found - show to Claude via stderr with exit code 2
        error_output = {
            "diagnostics_found": True,
            "file": file_path,
            "diagnostics": result
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(2)
    else:
        # No diagnostics found - allow the operation
        sys.exit(0)
        
except Exception as e:
    # On any error, exit normally to not block the operation
    sys.exit(0)


