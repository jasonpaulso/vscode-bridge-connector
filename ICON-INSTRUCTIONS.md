# 🖼️ ICON PLACEMENT INSTRUCTIONS

## 📍 **Where to Place Your Icon:**

Save your icon file as: `icon.png`
Location: **Root directory** (same level as package.json)

```
vscode-bridge-connector/
├── icon.png          ← YOUR ICON GOES HERE
├── package.json
├── README.md
├── src/
└── ...
```

## 📏 **Icon Requirements:**

- **Format**: PNG (preferred) or JPEG
- **Size**: 128x128 pixels (exactly)
- **Background**: Transparent or solid color
- **Content**: Should represent a bridge/connector concept

## 🎨 **Icon Suggestions:**

Since your extension is a "Bridge Connector 🔌🌉", consider:
- A bridge icon with plug/socket elements
- Network/connection symbols
- Modern, minimalist design
- Colors that work on light/dark themes

## 🚀 **After Adding Icon:**

1. Save your 128x128 PNG as `icon.png` in root directory
2. The package.json already references it correctly
3. Build and package your extension

## 🎯 **Current package.json setup:**
```json
"icon": "icon.png"
```

This path is relative to your extension root directory.
