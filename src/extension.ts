import * as vscode from "vscode";
import * as http from "http";

/**
 * Server singleton and UI status
 */
let server: http.Server | null = null;
let statusBar: vscode.StatusBarItem;

/**
 * Config helper
 */
function config() {
  return vscode.workspace.getConfiguration("bridgeConnector");
}

/**
 * Logging helpers
 */
function now() {
  return new Date().toISOString();
}
function logInfo(message: string, ...args: unknown[]) {
  console.log(`[${now()}] ${message}`, ...args);
}
function logWarn(message: string, ...args: unknown[]) {
  console.warn(`[${now()}] ${message}`, ...args);
}
function logError(message: string, ...args: unknown[]) {
  console.error(`[${now()}] ${message}`, ...args);
}

/**
 * HTTP helpers
 */
function writeJson(res: http.ServerResponse, code: number, body: unknown) {
  if (!res.headersSent) {
    res.writeHead(code, { "Content-Type": "application/json" });
  }
  res.end(JSON.stringify(body));
}
function writeError(
  res: http.ServerResponse,
  code: number,
  error: string,
  message: string,
  extra?: Record<string, unknown>
) {
  writeJson(res, code, { error, message, timestamp: now(), ...(extra || {}) });
}
function handlePreflight(req: http.IncomingMessage, res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-vscode-key");
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return true;
  }
  return false;
}
function healthPayload() {
  return {
    status: "healthy",
    version: "0.0.2",
    timestamp: now(),
    uptime: Math.floor(process.uptime()),
  };
}

/**
 * Request body parsing with size limit
 */
async function parseBody(
  req: http.IncomingMessage,
  limitBytes: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";
    req.on("data", (chunk: Buffer | string) => {
      const len = typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
      size += len;
      if (size > limitBytes) {
        reject(new Error("Request body exceeds limit"));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", (err) => reject(err));
    req.on("timeout", () => reject(new Error("Request Timeout")));
  });
}

/**
 * Auth helper
 */
function isAuthed(req: http.IncomingMessage, apiKey: string) {
  const key = req.headers["x-vscode-key"];
  return !!key && key === apiKey;
}

/**
 * VSCode special command handlers that aren't regular commands
 */
async function handleSpecialCommand(
  command: string,
  args: unknown[] | undefined
): Promise<unknown | typeof NotHandled> {
  if (command === "vscode.window.showInformationMessage") {
    return vscode.window.showInformationMessage((args?.[0] as string) || "Message");
  }
  if (command === "vscode.window.showWarningMessage") {
    return vscode.window.showWarningMessage((args?.[0] as string) || "Warning");
  }
  if (command === "vscode.window.showErrorMessage") {
    return vscode.window.showErrorMessage((args?.[0] as string) || "Error");
  }
  if (command === "vscode.window.showOpenDialog") {
    return vscode.window.showOpenDialog((args?.[0] as vscode.OpenDialogOptions) || {});
  }
  if (command === "vscode.languages.getDiagnostics") {
    const pathArg = (args?.[0] as string) || "";
    const pathUri = vscode.Uri.file(pathArg);
    return vscode.languages.getDiagnostics(pathUri);
  }
  return NotHandled;
}
const NotHandled = Symbol("NotHandled");

/**
 * Status bar
 */
function updateStatus() {
  if (server) {
    statusBar.text = "$(plug) Bridge: Running";
    statusBar.tooltip = "Click to open Bridge Connector menu";
  } else {
    statusBar.text = "$(debug-disconnect) Bridge: Stopped";
    statusBar.tooltip = "Click to open Bridge Connector menu";
  }
  statusBar.show();
}

/**
 * Server lifecycle
 */
async function startServer() {
  if (server) {
    return; // idempotent
  }

  const cfg = config();
  const port = cfg.get<number>("port", 8282);
  const apiKey = cfg.get<string>("apiKey", "");

  // Validate workspace exists for parity with original behavior
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      "🚫 No workspace folder found - cannot locate .env file."
    );
    return;
  }

  server = http.createServer(async (req, res) => {
    const userAgent = req.headers["user-agent"] || "Unknown";
    logInfo(
      `${req.method} ${req.url} - ${userAgent} from ${req.socket.remoteAddress}`
    );

    // CORS / Preflight
    if (handlePreflight(req, res)) {
      return;
    }

    // Health check first, no auth
    if (req.method === "GET" && req.url === "/health") {
      return writeJson(res, 200, healthPayload());
    }

    // Auth for all other routes
    if (!isAuthed(req, apiKey)) {
      const keyPresent = !!req.headers["x-vscode-key"];
      logWarn(
        `Unauthorized access attempt with key: ${keyPresent ? "INVALID" : "MISSING"}`
      );
      return writeError(res, 401, "Unauthorized", "Invalid or missing API key");
    }

    // POST /command route
    if (req.method === "POST" && req.url === "/command") {
      try {
        // Enforce Content-Length limit (10KB) and parse
        const contentLength = parseInt(req.headers["content-length"] || "0", 10);
        if (contentLength > 10000) {
          logWarn(`Request too large: ${contentLength} bytes`);
          return writeError(
            res,
            413,
            "Request too large",
            "Request body exceeds 10KB limit"
          );
        }
        const raw = await parseBody(req, 10000);
        if (!raw.trim()) {
          return writeError(res, 400, "Bad Request", "Empty request body");
        }

        type CommandBody = { command?: unknown; args?: unknown[] };
        let parsed: CommandBody;
        try {
          parsed = JSON.parse(raw) as CommandBody;
        } catch (e) {
          return writeError(res, 400, "Bad Request", "Invalid JSON body");
        }

        const command = typeof parsed.command === "string" ? parsed.command : undefined;
        const args = Array.isArray(parsed.args) ? parsed.args : [];

        if (!command) {
          return writeError(
            res,
            400,
            "Bad Request",
            "Missing or invalid command field"
          );
        }

        logInfo(`Executing command: ${command} with args:`, args);

        // Try special handlers first
        const special = await handleSpecialCommand(command, args);
        if (special !== NotHandled) {
          return writeJson(res, 200, {
            result: special,
            timestamp: now(),
            command,
            success: true,
          });
        }

        // Fallback to executing standard VSCode command
        const result = await vscode.commands.executeCommand(command, ...args);
        return writeJson(res, 200, {
          result,
          timestamp: now(),
          command,
          success: true,
        });
      } catch (err) {
        logError("Command execution error:", err);
        return writeJson(res, 500, {
          error: "Internal Server Error",
          message: String(err),
          timestamp: now(),
          success: false,
        });
      }
    }

    // 404 for anything else
    return writeJson(res, 404, {
      error: "Not Found",
      message: `Route ${req.method} ${req.url} not found`,
      timestamp: now(),
      availableRoutes: [
        "GET /health - Health check (no auth required)",
        "POST /command - Execute VSCode command (requires x-vscode-key header)",
      ],
    });
  });

  server.listen(port, "127.0.0.1", () => {
    updateStatus();
    logInfo(`Bridge Connector started on port ${port}`);
    vscode.window.showInformationMessage(
      `🔌 Bridge Connector running on port ${port}`
    );
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    logError("Server error:", err);
    if (err.code === "EADDRINUSE") {
      vscode.window.showErrorMessage(
        `🚫 Port ${port} is already in use. Try a different port in settings.`
      );
    } else if (err.code === "EACCES") {
      vscode.window.showErrorMessage(
        `🚫 Permission denied on port ${port}. Try a port above 1024.`
      );
    } else {
      vscode.window.showErrorMessage(`🚫 Server error: ${err.message}`);
    }
    server = null;
    updateStatus();
  });

  server.on("close", () => {
    logInfo("Bridge Connector server closed");
  });
}

async function stopServer() {
  if (!server) return; // idempotent
  try {
    server.close();
  } finally {
    server = null;
    vscode.window.showInformationMessage("🛑 Bridge Connector stopped");
    updateStatus();
  }
}

/**
 * Activation / deactivation
 */
export function activate(context: vscode.ExtensionContext) {
  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(statusBar);

  const toggle = async () => {
    if (server) {
      await stopServer();
    } else {
      await startServer();
    }
  };

  const showMenu = async () => {
    const cfg = config();
    const port = cfg.get<number>("port", 8282);
    const isRunning = server !== null;

    const statusText = isRunning ? "🟢 Running" : "🔴 Stopped";
    const toggleText = isRunning ? "⏸️ Stop Bridge" : "▶️ Start Bridge";

    const items: Array<{ label: string; description?: string; action: "toggle" | "status" | "settings" }> = [
      {
        label: toggleText,
        description: `Bridge is currently ${isRunning ? "running" : "stopped"}`,
        action: "toggle",
      },
      {
        label: `📊 Status: ${statusText}`,
        description: `Port: ${port} | Click to refresh status`,
        action: "status",
      },
      {
        label: "⚙️ Extension Settings",
        description: "Configure port and startup options",
        action: "settings",
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "🔌 Bridge Connector Menu",
      title: "VSCode Bridge Connector 🔌🌉",
    });

    if (!selected) return;

    switch (selected.action) {
      case "toggle":
        await toggle();
        break;
      case "status": {
        const statusMsg = isRunning
          ? `🟢 Bridge is running on port ${port}`
          : "🔴 Bridge is stopped";
        vscode.window.showInformationMessage(statusMsg);
        break;
      }
      case "settings":
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "@ext:1WAYTO.vscode-bridge-connector"
        );
        break;
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("bridgeConnector.showMenu", showMenu),
    vscode.commands.registerCommand("bridgeConnector.toggle", toggle),
    vscode.commands.registerCommand("bridgeConnector.openSettings", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:1WAYTO.vscode-bridge-connector"
      );
    })
  );

  statusBar.command = "bridgeConnector.showMenu";
  updateStatus();

  const cfg = config();
  if (cfg.get<boolean>("enable")) {
    void startServer();
  }
}

export function deactivate() {
  if (server) {
    server.close();
    server = null;
  }
}
