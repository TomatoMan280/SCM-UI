const fs = require('fs');
const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buf = Buffer.from(b64, 'base64');
const paths = ["icon.png", "build/icon.png", "Build/icon.png", "dist/icon.png"];
for (const p of paths) {
  if (fs.existsSync(p)) {
    fs.writeFileSync(p, buf);
    console.log("Fixed", p);
  } else {
    // create the build directories and write
    const dir = p.substring(0, p.lastIndexOf('/'));
    if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, buf);
    console.log("Created", p);
  }
}
