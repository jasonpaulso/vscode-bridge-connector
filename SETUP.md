# VSCode Bridge Connector - Setup Instructions

## 🚀 Quick Start

1. **Create .env File**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and set your API key
   VSCODE_API_KEY=your-secret-key-here
   ```

2. **Build the Extension**
   ```shell
   # Install dependencies
   npm install
   npm run build
   ```

3. **Test the Extension**
   - Press `F5` in VSCode to launch Extension Development Host
   - Look for "Bridge: Stopped" in the bottom-right status bar
   - Click it to open the popup menu and start the bridge

4. **Test External API**
   ```powershell
   # The example script now uses CommonJS (require) for better Node.js compatibility
   node example-usage.js
   ```

## 🧪 **Alternative Test Setup**

For testing in a separate project directory:

1. **Quick test setup**:
   ```bash
   mkdir bridge-test && cd bridge-test
   cp ../test-client-package.json package.json
   npm install
   echo "VSCODE_API_KEY=your-secret-key-here" > .env
   cp ../example-usage.js test.js
   node test.js
   ```

## 📁 Project Structure

```
vscode-bridge-connector/
├── src/
│   └── extension.ts          # Main extension code
├── out/                      # Compiled JavaScript
├── .vscode/                  # VSCode configuration
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript config
├── README.md                # Documentation
├── example-usage.js         # Working CommonJS example
├── test-client-package.json # Test setup helper
├── .env.example             # Environment template
├── .vscodeignore            # Package exclusions
└── SETUP.md                 # This file
```

## 🔧 **New in v0.0.2:**
- ✅ Fixed CommonJS compatibility in example-usage.js
- ✅ Added test-client-package.json for easier testing
- ✅ Cleaner project structure
- ✅ Better Node.js compatibility

## 🔧 Configuration

Access via Command Palette → "Preferences: Open Settings (UI)" → Search "Bridge Connector"

- **Port**: Change the HTTP server port (default: 8282)
- **Enable**: Auto-start bridge when VSCode opens

## 🧪 Testing Commands

Try these VSCode commands through the API:

```javascript
// Insert a new line
{ command: "editor.action.insertLineAfter" }

// Show command palette
{ command: "workbench.action.showCommands" }

// Open settings
{ command: "workbench.action.openSettings" }

// Format document
{ command: "editor.action.formatDocument" }
```

## 📦 Publishing

When ready to publish:

1. Install vsce: `npm install -g vsce`
2. Package: `vsce package`
3. Publish: `vsce publish`

## 🛠️ Development

- `npm run watch` - Watch mode for development
- `F5` - Launch Extension Development Host
- `Ctrl+Shift+P` → "Developer: Reload Window" to reload changes

Created by Eric Lee (hello@1wayto.com) 🚀
