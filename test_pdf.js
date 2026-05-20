import { execSync } from 'child_process';
execSync('python3 test_pdf.py', {stdio: 'inherit'});
