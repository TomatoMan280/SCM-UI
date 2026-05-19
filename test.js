const { execSync } = require('child_process');
try {
  const result = execSync('python3 src/silhouette-card-maker-main/create_pdf.py --help');
  console.log(result.toString());
} catch (e) {
  console.error(e.message);
  if (e.stdout) console.log(e.stdout.toString());
  if (e.stderr) console.log(e.stderr.toString());
}
