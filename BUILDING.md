# Building Silhouette targetting Desktop (Linux, macOS, Windows)

We use Vite to build the web user interface, Express.js to host the internal APIs, and Electron to wrap the interface into native desktop applications for macOS, Windows, and Linux.

## Requirements

1. **Node.js** (v18+)
2. **Python 3** (v3.10+)
3. **NPM** (comes with Node.js)
4. Dependencies installed by running `npm i`

If you haven't installed dependencies:
```bash
npm run install-deps
npm install
```

## How to Build

We have NPM scripts already defined in `package.json` that handle building for your target OS. 

1. **Windows**
   ```bash
   npm run desktop:build:win
   ```
   This command will run `vite build`, bundle the node server, and use `electron-builder` to create an NSIS installer under the `release/` directory.

2. **macOS**
   ```bash
   npm run desktop:build:mac
   ```
   This creates a `.dmg` installer in the `release/` directory. (Note: To build for macOS, you must run this command on a macOS machine).

3. **Linux**
   ```bash
   npm run desktop:build:linux
   ```
   This creates an AppImage in the `release/` directory.

## Running Locally for Desktop Development

If you want to run the desktop wrapper locally during development without creating an installer:
```bash
npm run desktop:dev
```

## Running on Mobile (iPhone / Android)

Since Silhouette relies on a Node.js server and Python scripts to download files and manipulate assets locally, it cannot currently be bundled into a standalone native iOS or Android app (like it can for desktop with Electron).

However, you can still use the app from your iPhone by hosting the server on your computer and accessing it over your local Wi-Fi network:

1. Ensure your computer and iPhone are on the same Wi-Fi network.
2. Run the development server on your computer:
   ```bash
   npm run dev
   ```
3. Find your computer's local IP address (e.g., `192.168.1.15`).
4. Open Safari on your iPhone and navigate to `http://<YOUR_COMPUTER_IP>:3000`.

*Note: For the application to be accessible, the host in `server.ts` or Vite must be bound to `0.0.0.0` (which is the default in this project).*

### Path to a True Standalone Mobile App
Currently, a standalone native iOS/Android application is challenging because the codebase heavily relies on a Node.js server and Python binaries (for PDF generation, file management, and API scraping). To make this a true standalone mobile app, you would need to take one of these two approaches:

**Option A: Cloud-Backend + PWA/Capacitor (Recommended)**
1. Host the backend (`server.ts` + Python scripts) on a cloud provider like Railway, Render, or Google Cloud Run.
2. Update the React frontend to make API calls to your newly hosted cloud URL instead of `localhost`.
3. Wrap the frontend using a framework like [Capacitor](https://capacitorjs.com/) or install it as a PWA (Progressive Web App) on your phone.

**Option B: Pure JavaScript Rewrite (No Backend Needed)**
1. Rewrite all Python logic (e.g., `create_pdf.py`, `fetch.py`, `scryfall` plugins) into pure JavaScript/TypeScript.
2. Use browser-compatible libraries like `pdf-lib` or `jspdf` for PDF generation, and standard browser `fetch()` for API calls.
3. Migrate local file system operations (like saving and retrieving PNGs) to IndexedDB or the Mobile Device's native file system using Capacitor plugins.
4. Bundle the newly purely-client-side application for iOS/Android using Capacitor or React Native.

## Common Issues

* **Python missing**: The desktop application internally runs python scripts for the plugins. Ensure `python3` is available in your PATH.
* **macOS Notarization**: If you plan to distribute the macOS `.dmg`, you'll need to configure an Apple Developer account and use `@electron/notarize`. For personal local builds, this is not required.
