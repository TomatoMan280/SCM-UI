const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const regex = /scmSourcePath/g;

let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
   if (i < 150) continue;
   if (i > 1630 && i < 1700) continue;

   lines[i] = lines[i].replace(/scmSourcePath/g, 'scmPath');
}

fs.writeFileSync('server.ts', lines.join('\n'));
