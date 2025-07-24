import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

let server: http.Server | null = null;
let statusBar: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBar);

  const toggle = async () => {
    if (server) {
      await stopServer();
    } else {
      await startServer();
    }
  };

  const showMenu = async () => {
    const cfg = vscode.workspace.getConfiguration('bridgeConnector');
    const port = cfg.get<number>('port', 8282);
    const isRunning = server !== null;
    
    const statusText = isRunning ? '🟢 Running' : '🔴 Stopped';
    const toggleText = isRunning ? '⏸️ Stop Bridge' : '▶️ Start Bridge';
    
    const items = [
      {
        label: toggleText,
        description: `Bridge is currently ${isRunning ? 'running' : 'stopped'}`,
        action: 'toggle'
      },
      {
        label: `📊 Status: ${statusText}`,
        description: `Port: ${port} | Click to refresh status`,
        action: 'status'
      },
      {
        label: '⚙️ Extension Settings',
        description: 'Configure port and startup options',
        action: 'settings'
      }
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '🔌 Bridge Connector Menu',
      title: 'VSCode Bridge Connector 🔌🌉'
    });

    if (selected) {
      switch (selected.action) {
        case 'toggle':
          await toggle();
          break;
        case 'status':
          const statusMsg = isRunning 
            ? `🟢 Bridge is running on port ${port}` 
            : '🔴 Bridge is stopped';
          vscode.window.showInformationMessage(statusMsg);
          break;
        case 'settings':
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            '@ext:1WAYTO.vscode-bridge-connector'
          );
          break;
      }
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('bridgeConnector.showMenu', showMenu),
    vscode.commands.registerCommand('bridgeConnector.toggle', toggle),
    vscode.commands.registerCommand('bridgeConnector.openSettings', () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:1WAYTO.vscode-bridge-connector'
      );
    })
  );

  statusBar.command = 'bridgeConnector.showMenu';
  updateStatus();

  const cfg = vscode.workspace.getConfiguration('bridgeConnector');
  if (cfg.get<boolean>('enable')) {
    startServer();
  }
}

async function startServer() {
  const cfg = vscode.workspace.getConfiguration('bridgeConnector');
  const port = cfg.get<number>('port', 8282);
  
  // Look for .env file in workspace
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('🚫 No workspace folder found - cannot locate .env file.');
    return;
  }
  
  const envPath = path.join(workspaceFolder.uri.fsPath, '.env');
  let secret: string | undefined;
  
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      for (const line of envLines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('VSCODE_API_KEY=')) {
          secret = trimmed.split('=')[1]?.trim().replace(/["']/g, '');
          break;
        }
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(`🔑 Error reading .env file: ${error}`);
    return;
  }
  
  if (!secret) {
    vscode.window.showErrorMessage('🔑 VSCODE_API_KEY not found in .env file—cannot start bridge. Create a .env file with VSCODE_API_KEY=your-key');
    return;
  }

  server = http.createServer(async (req, res) => {
    // Enhanced security and error handling
    const key = req.headers['x-vscode-key'];
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const timestamp = new Date().toISOString();
    
    // Enhanced request logging
    console.log(`[${timestamp}] ${req.method} ${req.url} - ${userAgent} from ${req.socket.remoteAddress}`);
    
    // Content-Length validation for POST requests
    if (req.method === 'POST') {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > 10000) { // 10KB limit
        console.warn(`[${timestamp}] Request too large: ${contentLength} bytes`);
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Request too large', 
          message: 'Request body exceeds 10KB limit',
          timestamp: timestamp
        }));
        return;
      }
    }

    // CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vscode-key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint (no authentication required) - CHECK THIS FIRST!
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        version: '0.0.2',
        timestamp: timestamp,
        uptime: Math.floor(process.uptime())
      }));
      return;
    }
    
    // Authentication check for all other endpoints
    if (key !== secret) {
      console.warn(`[${timestamp}] Unauthorized access attempt with key: ${key ? 'INVALID' : 'MISSING'}`);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
        timestamp: timestamp
      }));
    }

    // Route handling with enhanced responses
    if (req.method === 'POST' && req.url === '/command') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          // Enhanced input validation
          if (!body.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              error: 'Bad Request',
              message: 'Empty request body',
              timestamp: timestamp
            }));
          }
          
          const { command, args } = JSON.parse(body);
          
          if (!command || typeof command !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              error: 'Bad Request',
              message: 'Missing or invalid command field',
              timestamp: timestamp
            }));
          }
          
          console.log(`[${timestamp}] Executing command: ${command} with args:`, args || []);
          
          // Special handling for VSCode API calls that aren't commands
          if (command === 'vscode.window.showInformationMessage') {
            const result = await vscode.window.showInformationMessage(args?.[0] || 'Message');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              result, 
              timestamp,
              command,
              success: true 
            }));
            return;
          }
          
          if (command === 'vscode.window.showWarningMessage') {
            const result = await vscode.window.showWarningMessage(args?.[0] || 'Warning');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              result, 
              timestamp,
              command,
              success: true 
            }));
            return;
          }
          
          if (command === 'vscode.window.showErrorMessage') {
            const result = await vscode.window.showErrorMessage(args?.[0] || 'Error');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              result, 
              timestamp,
              command,
              success: true 
            }));
            return;
          }
          
          if (command === 'vscode.window.showOpenDialog') {
            const result = await vscode.window.showOpenDialog(args?.[0] || {});
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              result, 
              timestamp,
              command,
              success: true 
            }));
            return;
          }
          
          // Execute as regular VSCode command
          const result = await vscode.commands.executeCommand(command, ...(args || []));
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            result, 
            timestamp,
            command,
            success: true 
          }));
        } catch (err) {
          console.error(`[${timestamp}] Command execution error:`, err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Internal Server Error',
            message: String(err),
            timestamp,
            success: false 
          }));
        }
      });
      
      // Handle request timeout
      req.on('timeout', () => {
        console.warn(`[${timestamp}] Request timeout`);
        if (!res.headersSent) {
          res.writeHead(408, { 'Content-Type': 'text/plain' });
          res.end('Request Timeout');
        }
      });
      
    } else {
      // Enhanced 404 response with available routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
        timestamp: timestamp,
        availableRoutes: [
          'GET /health - Health check (no auth required)',
          'POST /command - Execute VSCode command (requires x-vscode-key header)'
        ]
      }));
    }
  });

  server.listen(port, '127.0.0.1', () => {
    updateStatus();
    console.log(`[${new Date().toISOString()}] Bridge Connector started on port ${port}`);
    vscode.window.showInformationMessage(`🔌 Bridge Connector running on port ${port}`);
  });

  // Enhanced error handling for server
  server.on('error', (err: any) => {
    console.error(`[${new Date().toISOString()}] Server error:`, err);
    if (err.code === 'EADDRINUSE') {
      vscode.window.showErrorMessage(`🚫 Port ${port} is already in use. Try a different port in settings.`);
    } else if (err.code === 'EACCES') {
      vscode.window.showErrorMessage(`🚫 Permission denied on port ${port}. Try a port above 1024.`);
    } else {
      vscode.window.showErrorMessage(`🚫 Server error: ${err.message}`);
    }
    server = null;
    updateStatus();
  });

  server.on('close', () => {
    console.log(`[${new Date().toISOString()}] Bridge Connector server closed`);
  });
}

async function stopServer() {
  if (server) {
    server.close();
    server = null;
    vscode.window.showInformationMessage('🛑 Bridge Connector stopped');
    updateStatus();
  }
}

function updateStatus() {
  if (server) {
    statusBar.text = '$(plug) Bridge: Running';
    statusBar.tooltip = 'Click to open Bridge Connector menu';
  } else {
    statusBar.text = '$(debug-disconnect) Bridge: Stopped';
    statusBar.tooltip = 'Click to open Bridge Connector menu';
  }
  statusBar.show();
}

export function deactivate() {
  if (server) {
    server.close();
  }
}
