# VSCode Bridge Connector 🔌🌉

A secure HTTP bridge extension that allows external applications to communicate with VSCode through a local API.

## Features

- 🔐 **Secure API**: Uses local `.env` file for authentication
- � **Smart Menu**: Click status bar for a popup menu with options
- ⚙️ **Configurable**: Customize port and startup settings
- 🎯 **Command Execution**: Execute any VSCode command remotely

## Setup

1. Install the extension
2. Create a `.env` file in your workspace root with:
   ```
   VSCODE_API_KEY=your-secret-key-here
   ```
3. Click the bridge status in the status bar to open the menu:
   - **▶️ Start/⏸️ Stop** - Control the bridge server
   - **📊 Status** - View current status and port
   - **⚙️ Settings** - Access extension configuration
4. The bridge runs on port 8282 (configurable)

## Configuration

Access settings via Command Palette: `Bridge Connector: Open Settings`

- `bridgeConnector.port`: Port number (default: 8282)
- `bridgeConnector.enable`: Auto-start on VSCode launch (default: false)

## API Endpoints

### Health Check (No Authentication Required)
```http
GET /health
```

Returns bridge status without requiring authentication:
```json
{
  "status": "healthy",
  "version": "0.0.2", 
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

### Execute Commands (Authentication Required)
```http
POST /command
```

Headers:
- `Content-Type: application/json`  
- `x-vscode-key: your-api-key`

Body:
```json
{
  "command": "vscode.window.showInformationMessage",
  "args": ["Hello World!"]
}
```

## Usage

### Enhanced Example Script (`example-usage.js`)

```javascript
// VSCode Bridge Connector - Enhanced Example Usage
// Make sure your .env file contains: VSCODE_API_KEY=your-secret-key

const http = require('http');
require('dotenv').config();

const API_KEY = process.env.VSCODE_API_KEY;
const PORT = 8282; // Default port, adjust if changed in settings

// Helper function to make HTTP requests (using built-in http module)
function makeRequest(method, path, data = null, requiresAuth = true) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add authentication header for protected endpoints
    if (requiresAuth) {
      options.headers['x-vscode-key'] = API_KEY;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || parsed.error}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Health check example (no authentication required)
async function healthCheck() {
  console.log('🔍 Checking bridge health...');
  try {
    const result = await makeRequest('GET', '/health', null, false);
    console.log('✅ Bridge is healthy:', result);
    return result;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    throw error;
  }
}

// Show message examples
async function showMessage() {
  console.log('📢 Showing information message...');
  const result = await makeRequest('POST', '/command', {
    command: 'vscode.window.showInformationMessage',
    args: ['Hello from Bridge Connector! 🎉']
  });
  console.log('✅ Message shown:', result);
}

// File operations
async function openFile() {
  console.log('📂 Opening file dialog...');
  const result = await makeRequest('POST', '/command', {
    command: 'vscode.window.showOpenDialog',
    args: [{
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'Text files': ['txt'],
        'All files': ['*']
      }
    }]
  });
  console.log('✅ File dialog result:', result);
}

// Main execution with comprehensive testing
async function main() {
  console.log('🚀 VSCode Bridge Connector - Enhanced Example Usage\n');
  
  try {
    // Health check (no auth required)
    await healthCheck();
    console.log('');
    
    // Test VSCode API calls
    await showMessage();
    console.log('');
    
    await openFile();
    console.log('');
    
    console.log('🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('💥 Example execution failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Make sure VSCode Bridge Connector extension is running');
    console.log('- Check that the API key matches your .env file');
    console.log('- Verify the port number (default: 8282)');
    console.log('- Ensure the bridge is enabled in VSCode settings');
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main();
}
```

### From External Applications

```javascript
// Example external usage (CommonJS - works with Node.js)
// First install: npm install node-fetch@2.7.0 dotenv
const fetch = require('node-fetch');
require('dotenv').config();

const secret = process.env.VSCODE_API_KEY;

(async () => {
  const res = await fetch('http://localhost:8282/command', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vscode-key': secret
    },
    body: JSON.stringify({
      command: 'workbench.action.chat.open',
      args: ["Hello, can you help me with my code?"]    
    })
  });

  if (res.ok) {
    const { result } = await res.json();
    console.log('✅ Command executed:', result);
  } else {
    console.error('❌ Failed:', await res.text());
  }
})();
```

## Security

- Bridge only accepts connections from localhost (127.0.0.1)
- All requests must include the correct API key in the `x-vscode-key` header
- No API key = no access 🔐

## Commands

- `Bridge Connector: Show Menu` - Open the Bridge Connector popup menu
- `Bridge Connector: Toggle` - Start/stop the bridge directly
- `Bridge Connector: Open Settings` - Open extension settings

## 🆕 What's New in v0.0.2

- ✅ **Health Check Endpoint**: New `GET /health` endpoint for monitoring (no auth required)
- ✅ **VSCode API Support**: Direct handlers for message dialogs and file operations
- ✅ **Enhanced Error Handling**: Better error messages with JSON responses and timestamps  
- ✅ **Request Validation**: Input validation and 10KB request size limits
- ✅ **CORS Support**: Cross-origin request handling for web applications
- ✅ **Improved Logging**: Better request logging with user agent and detailed timestamps
- ✅ **Authentication Bug Fix**: Health endpoint now works without API key as intended
- ✅ **Environment Variables**: Example script now uses `dotenv` for better API key management
- ✅ **Security Enhancements**: Better unauthorized access handling and error responses

## Files in This Package

- `example-usage.js` - Working CommonJS example script
- `test-client-package.json` - Quick test setup configuration
- `.env.example` - Environment variable template
- `icon.png` - Extension icon (128x128)

## Author

Created by **Eric Lee** (hello@1wayto.com)

## License

MIT
