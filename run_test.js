import { execSync } from 'child_process';
execSync("python3 resize_icon.py", {stdio: 'inherit'});
