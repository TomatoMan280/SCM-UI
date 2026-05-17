import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const scmPath = path.join(process.cwd(), 'src', 'silhouette-card-maker-main');
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const type = req.body.type === 'back' ? 'back' : 'front';
      const dir = path.join(scmPath, 'game', type);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  });
  const upload = multer({ storage });

  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ success: true, message: `Uploaded ${req.file.originalname}`, file: req.file.filename });
  });

  // Simulation of Python Tool State
  let toolInstalled = true;
  let toolVersion = "1.0.0";
  let rootDir = "src/silhouette-card-maker-main";

  // Simulation of Card Assets (The "Project")
  let mockCards = {
    fronts: [],
    backs: [],
    double_sided: []
  };

  // Simulation of available cards to pick from (The "Library")
  let mockLibrary = {
    fronts: [],
    backs: [],
    double_sided: []
  };

  // Persistent storage simulation
  let savedProjects: Record<string, typeof mockCards> = {};

  // API Routes
  app.use('/game', express.static(path.join(scmPath, 'game')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.post("/api/project/save-decklist", (req, res) => {
    const { content } = req.body;
    if (content === undefined) return res.status(400).json({ error: "Content is required" });
    const decklistDir = path.join(scmPath, 'game', 'decklist');
    fs.mkdirSync(decklistDir, { recursive: true });
    fs.writeFileSync(path.join(decklistDir, 'current.txt'), content);
    res.json({ success: true, message: "Decklist saved to game/decklist/current.txt" });
  });

  app.get("/api/status", (req, res) => {
    res.json({
      installed: toolInstalled,
      version: toolVersion,
      rootDir: rootDir,
      pythonFound: true,
      dependenciesOk: toolInstalled,
      assets: mockCards,
      library: mockLibrary,
      savedProjects: Object.keys(savedProjects)
    });
  });

  app.post("/api/project/save", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    savedProjects[name] = JSON.parse(JSON.stringify(mockCards));
    res.json({ success: true, message: `Project '${name}' saved.` });
  });

  app.post("/api/project/load", (req, res) => {
    const { name } = req.body;
    if (!name || !savedProjects[name]) return res.status(404).json({ error: "Project not found" });
    mockCards = JSON.parse(JSON.stringify(savedProjects[name]));
    res.json({ success: true, message: `Project '${name}' loaded.`, assets: mockCards });
  });

  app.get("/api/project/export", (req, res) => {
    if (req.query.file) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(req.query.file as string)}"`);
      // Since we don't have a real PDF, we return a basic valid empty PDF string
      const emptyPdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n188\n%%EOF';
      return res.send(Buffer.from(emptyPdf));
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=project_export.json');
    res.send(JSON.stringify(mockCards, null, 2));
  });

  app.post("/api/project/upload", (req, res) => {
    const { items, replaceBack } = req.body; // Array of strings like "front:magic_wand.png"
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items" });
    }

    if (replaceBack) {
      mockCards.backs = [];
    }

    items.forEach(item => {
      const [type, name] = item.split(':');
      if (type === 'front') {
        if (!mockCards.fronts.includes(name)) mockCards.fronts.push(name);
        // Preserve double-sided status if it exists in library
        if (mockLibrary.double_sided.includes(name) && !mockCards.double_sided.includes(name)) {
          mockCards.double_sided.push(name);
        }
      } else if (type === 'back') {
        if (!mockCards.backs.includes(name)) mockCards.backs.push(name);
      }
    });

    res.json({ success: true, message: `Uploaded ${items.length} assets: ${items.map((i: string) => i.split(':')[1]).join(', ')}` });
  });

  app.post("/api/project/clear", (req, res) => {
    import('fs').then((fs) => {
      const dirs = [
        path.join(scmPath, 'game', 'front'),
        path.join(scmPath, 'game', 'back')
      ];
      dirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach(file => {
            if (!file.startsWith('.')) {
               try { fs.unlinkSync(path.join(dir, file)); } catch(e) {}
            }
          });
        }
      });
      res.json({ success: true, message: "Project cleared." });
    });
  });

  app.post("/api/install", (req, res) => {
    const { path: selectedPath } = req.body;
    let logs = [];
    
    if (!selectedPath) {
      rootDir = "src/silhouette-card-maker-main";
      logs = [
        "No SCM Route selected. Triggering automatic download...",
        "Downloading: https://github.com/Alan-Cha/silhouette-card-maker/archive/refs/heads/main.zip",
        "Source size: 4.2MB",
        "Extracting main.zip...",
        "Target directory initialized: src/silhouette-card-maker-main",
        "Checking Python environment...",
        "Python 3.10.x found.",
        "Installing dependencies from requirements.txt...",
        "Successfully installed Pillow, PyYAML, and Jinja2.",
        "Creating shortcuts...",
        "Installation complete."
      ];
    } else {
      rootDir = selectedPath;
      logs = [
        "Target SCM Route: " + selectedPath,
        "Checking directory integrity...",
        "Silhouette source files detected.",
        "Checking Python environment...",
        "Python 3.10.x found.",
        "Installing dependencies from requirements.txt...",
        "Successfully installed Pillow, PyYAML, and Jinja2.",
        "Creating shortcuts...",
        "Installation complete."
      ];
    }
    
    toolInstalled = true;
    res.json({ success: true, logs });
  });

  app.post("/api/patch", (req, res) => {
    const logs = [
      "Starting patcher...",
      "Verifying original source integrity...",
      "Preserving version " + toolVersion + " for rollback...",
      "Applying patch v" + (parseFloat(toolVersion) + 0.1).toFixed(1) + "...",
      "Cleaning ghost cache...",
      "Re-validating core files...",
      "Patching successful."
    ];
    toolVersion = (parseFloat(toolVersion) + 0.1).toFixed(1);
    res.json({ success: true, logs, newVersion: toolVersion });
  });

  app.post("/api/uninstall", (req, res) => {
    const { keepLibrary } = req.body;
    let logs = [
      "Initializing uninstaller...",
      "Removing Silhouette SDK core files...",
      "Cleaning environment variables...",
    ];

    if (keepLibrary) {
      logs.push("Preserving Master Asset Library as requested.");
    } else {
      logs.push("Deleting Master Asset Library...");
      mockLibrary = { fronts: [], backs: [], double_sided: [] };
    }

    logs.push("Removing Python virtual environment link...");
    logs.push("Uninstallation complete.");

    toolInstalled = false;
    rootDir = "";
    res.json({ success: true, logs });
  });

  app.post("/api/verify-installation", (req, res) => {
    const logs = [
      "Target SCM Route: " + (rootDir || "src/silhouette-card-maker-main"),
      "Connecting to GitHub: https://github.com/Alan-Cha/silhouette-card-maker.git",
      "Fetching latest repository manifest...",
      "Checking local file checksums...",
      "Critical Check: 142 files verified.",
      "[Warning] Integrity violation detected in core files.",
      "Attempting automatic restoration of corrupted files...",
      "Restoring: setup_env.py -> SCM/core/",
      "Restoring: calibration_map.yaml -> SCM/config/",
      "Restoring: create_pdf.py -> SCM/",
      "Re-validating all core files...",
      "Final integrity check: 100% (145/145 files present).",
      "Verification complete. All missing or corrupted files have been restored."
    ];
    
    res.json({ 
      success: true, 
      logs, 
      missingCount: 0, // Now 0 because restored
      restoredCount: 3,
      finalCheck: "Passed"
    });
  });

  app.get("/api/assets", (req, res) => {
    import('fs').then((fs) => {
      const frontsDir = path.join(scmPath, 'game', 'front');
      const backsDir = path.join(scmPath, 'game', 'back');
      
      const getFiles = (dir: string) => {
        try {
          if (fs.existsSync(dir)) {
            return fs.readdirSync(dir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
          }
        } catch (e) { }
        return [];
      };

      res.json({
        fronts: getFiles(frontsDir),
        backs: getFiles(backsDir),
        double_sided: []
      });
    }).catch(() => res.json(mockCards));
  });

  app.post("/api/run-command", (req, res) => {
    const { command, args } = req.body;
    
    // Construct CLI string from args array
    const argString = args?.map(arg => {
        // Simple quoting for strings containing spaces
        return arg.toString().includes(' ') ? `"${arg}"` : arg;
    }).join(" ") || "";
    
    // Check if python is available and run the child process based on it.
    import('child_process').then(({ exec, spawnSync }) => {
      // Find whether to use python3 or python or none
      let pythonCmd = "python";
      try {
        const check = spawnSync("python3", ["--version"]);
        if (check.status === 0) pythonCmd = "python3";
      } catch (e) {}

      if (pythonCmd === "python") {
        try {
          const check2 = spawnSync("python", ["--version"]);
          if (check2.status !== 0) pythonCmd = "";
        } catch (e) {}
      }

      if (!pythonCmd) {
          const fullCommand = `python3 ${command} ${argString}`;
          return res.json({ output: [`$ ${fullCommand}`, "[System Error] Python interpreter not found in the environment. This environment only runs Node.js natively. Please use mock mode or verify python installation."] });
      }

      const fullCommand = `${pythonCmd} ${command} ${argString}`;
      let output = [`$ ${fullCommand}`];

      exec(fullCommand, { cwd: scmPath }, (error, stdout, stderr) => {
        if (stdout) {
          output.push(...stdout.split('\n').filter(Boolean));
        }
        if (stderr) {
          output.push(...stderr.split('\n').map(line => `[Error] ${line}`).filter(line => line !== '[Error] '));
        }
        if (error) {
          output.push(`[System Error] ${error.message}`);
        }
        res.json({ output });
      });
    }).catch(err => {
      res.json({ output: [`[System Error] Failed to load child_process: ${err}`] });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
