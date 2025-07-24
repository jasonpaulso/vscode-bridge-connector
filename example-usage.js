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

// Show message example
async function showMessage() {
  console.log('📢 Showing information message...');
  try {
    const result = await makeRequest('POST', '/command', {
      command: 'vscode.window.showInformationMessage',
      args: ['Hello from Bridge Connector! 🎉']
    });
    console.log('✅ Message shown:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to show message:', error.message);
    throw error;
  }
}

// Open chat example (original functionality)
async function openChat() {
  console.log('💬 Opening VSCode Chat...');
  try {
    const result = await makeRequest('POST', '/command', {
      command: 'workbench.action.chat.open',
      args: ["Hello, can you help me with my code?"]
    });
    console.log('✅ Chat opened:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to open chat:', error.message);
    throw error;
  }
}

// File operations example
async function openFile() {
  console.log('📂 Opening file dialog...');
  try {
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
    return result;
  } catch (error) {
    console.error('❌ Failed to open file dialog:', error.message);
    throw error;
  }
}

// Error handling examples
async function testInvalidCommand() {
  console.log('🧪 Testing invalid command handling...');
  try {
    await makeRequest('POST', '/command', {
      command: 'nonexistent.command',
      args: []
    });
    console.log('⚠️ Unexpected success');
  } catch (error) {
    console.log('✅ Expected error handled correctly:', error.message);
  }
}

async function testInvalidRoute() {
  console.log('🧪 Testing 404 handling...');
  try {
    await makeRequest('GET', '/nonexistent');
    console.log('⚠️ Unexpected success');
  } catch (error) {
    console.log('✅ Expected 404 handled correctly:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 VSCode Bridge Connector - Enhanced Example Usage\n');
  
  try {
    // Test health check first (no auth required)
    await healthCheck();
    console.log('');
    
    // Test various commands
    await showMessage();
    console.log('');
    
    await openChat();
    console.log('');
    
    await openFile();
    console.log('');
    
    // Test error handling
    await testInvalidCommand();
    console.log('');
    
    await testInvalidRoute();
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