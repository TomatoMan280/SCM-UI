import fs from 'fs';
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/shadow-\[0_0_20px_rgba\(79,70,229,0\.3\)\]/g, 'shadow-[0_0_20px_var(--color-primary-500)]');
content = content.replace(/shadow-\[0_0_10px_rgba\(99,102,241,0\.5\)\]/g, 'shadow-[0_0_10px_var(--color-primary-500)]');
content = content.replace(/shadow-\[0_0_20px_rgba\(79,70,229,0\.1\)\]/g, 'shadow-[0_0_20px_var(--color-primary-600)]');

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced shadows');
