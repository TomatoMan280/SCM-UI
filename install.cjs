const { execSync } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';

async function install() {
  console.log(`[Install] Starting background setup for platform: ${os.platform()}`);

  if (!isWindows) {
    try {
      console.log("[Install] Attempting to install python3-pip on Linux...");
      execSync('export DEBIAN_FRONTEND=noninteractive && (sudo apt-get update || apt-get update) && (sudo apt-get install -y python3-pip || apt-get install -y python3-pip)', { stdio: 'inherit' });
    } catch (e) {
      console.log("[Install] Native package manager failed or skipped. Continuing to pip...");
    }
  }

  const pythonCmd = isWindows ? 'python' : 'python3';
  const pipArgs = 'install click cloudscraper ezdxf filetype matplotlib mtg_parser pyyaml pillow requests natsort pydantic pypdfium2 split-image pyautogui' + (isWindows ? '' : ' --break-system-packages');

  try {
    console.log(`[Install] Installing Python dependencies via ${pythonCmd} -m pip...`);
    execSync(`${pythonCmd} -m pip ${pipArgs}`, { stdio: 'inherit' });
    console.log("[Install] Python dependencies installed successfully.");
  } catch (e) {
    console.warn("[Install] Failed to install Python dependencies via pip automatically.");
    if (isWindows) {
      console.log("[Install] Tip: Ensure Python is installed and 'pip' is in your PATH.");
    }
  }
}

install();
