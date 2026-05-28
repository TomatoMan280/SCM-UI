const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const regex = /path\.join\(scmSourcePath, 'game'/g;
content = content.replace(regex, "path.join(scmPath, 'game'");

fs.writeFileSync('server.ts', content);
