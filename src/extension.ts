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
            '@ext:yourPublisher.vscode-bridge-connector'
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
        '@ext:yourPublisher.vscode-bridge-connector'
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
    const key = req.headers['x-vscode-key'];
    if (key !== secret) {
      res.writeHead(401);
      return res.end('Unauthorized');
    }

    if (req.method === 'POST' && req.url === '/command') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { command, args } = JSON.parse(body);
          const result = await vscode.commands.executeCommand(command, ...(args || []));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result }));
        } catch (err) {
          res.writeHead(500);
          res.end(String(err));
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, '127.0.0.1', () => {
    updateStatus();
    vscode.window.showInformationMessage(`🔌 Bridge Connector running on port ${port}`);
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
