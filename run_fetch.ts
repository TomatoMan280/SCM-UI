import { execSync } from 'child_process';
try {
  console.log(execSync('python3 src/silhouette-card-maker-main/plugins/mtg/fetch.py src/silhouette-card-maker-main/game/decklist/current.txt simple', { encoding: 'utf-8' }));
} catch (e: any) {
  console.error("Error executing:", e.message);
  console.error("stdout:", e.stdout);
  console.error("stderr:", e.stderr);
}
