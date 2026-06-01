import fs from 'fs';
import glob from 'glob';
import path from 'path';

const files = glob.sync('src/silhouette-card-maker-main/plugins/*/fetch.py');
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Ensure os is imported
    if (!content.includes('import os')) {
        content = content.replace('from os import path', 'import os\nfrom os import path');
    }
    
    // Add universal user-agent patch for urllib request to bypass Moxfield/Scryfall 403s
    if (!content.includes('urllib.request.install_opener')) {
        content = content.replace('import urllib.request', 'import urllib.request\nopener = urllib.request.build_opener()\nopener.addheaders = [("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0")]\nurllib.request.install_opener(opener)');
    }
    
    fs.writeFileSync('temp_fetch_inspect.txt', content.substring(0, 1000));
    
    // Replace game paths
    content = content.replace(/path\.join\(REPO_ROOT, 'game', 'front'\)/g, "os.path.join(os.environ.get('SCM_GAME_DIR', os.path.join(REPO_ROOT, 'game')), 'front')");
    content = content.replace(/os\.path\.join\(REPO_ROOT, 'game', 'front'\)/g, "os.path.join(os.environ.get('SCM_GAME_DIR', os.path.join(REPO_ROOT, 'game')), 'front')");

    content = content.replace(/path\.join\(REPO_ROOT, 'game', 'double_sided'\)/g, "os.path.join(os.environ.get('SCM_GAME_DIR', os.path.join(REPO_ROOT, 'game')), 'double_sided')");
    content = content.replace(/os\.path\.join\(REPO_ROOT, 'game', 'double_sided'\)/g, "os.path.join(os.environ.get('SCM_GAME_DIR', os.path.join(REPO_ROOT, 'game')), 'double_sided')");

    content = content.replace(/path\.join\(REPO_ROOT, 'game', 'back'\)/g, "os.path.join(os.environ.get('SCM_GAME_DIR', os.path.join(REPO_ROOT, 'game')), 'back')");
    content = content.replace(/os\.path\.join\(REPO_ROOT, 'game', 'back'\)/g, "os.path.join(os.environ.get('SCM_GAME_DIR', os.path.join(REPO_ROOT, 'game')), 'back')");
    
    fs.writeFileSync(file, content);
}
console.log('Done replacing plugins!');
