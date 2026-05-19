const { execSync } = require('child_process');
try {
  execSync('export DEBIAN_FRONTEND=noninteractive && sudo apt-get update && sudo apt-get install -y python3-pip', { stdio: 'inherit' });
} catch(e) {
  console.log("sudo apt-get failed, trying without sudo");
  try {
    execSync('export DEBIAN_FRONTEND=noninteractive && apt-get update && apt-get install -y python3-pip', { stdio: 'inherit' });
  } catch(e) {}
}
try {
  execSync('python3 -m pip install click cloudscraper ezdxf filetype matplotlib mtg_parser pyyaml pillow requests natsort pydantic pypdfium2 split-image pyautogui --break-system-packages', { stdio: 'inherit' });
} catch(e) {
  console.log(e);
}
