const fs = require('fs');
const b = fs.readFileSync('build/icon.png');
console.log(b.slice(0, 100).toString('hex'));
console.log(b.slice(0, 50).toString('utf8'));
