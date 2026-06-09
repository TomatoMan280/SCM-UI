import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const decklistPath = 'src/silhouette-card-maker-main/game/decklist/current.txt';
fs.mkdirSync(path.dirname(decklistPath), { recursive: true });

function testInput(input: string) {
    fs.writeFileSync(decklistPath, input);
    console.log(`\nTesting input: "${input}"`);
    try {
        console.log(execSync('python3 src/silhouette-card-maker-main/plugins/mtg/fetch.py src/silhouette-card-maker-main/game/decklist/current.txt simple', { encoding: 'utf-8' }).split('\n')[0]);
    } catch(e) {
        console.log(e.stdout.split('\n')[0]);
    }
}

testInput('2 Arena of Glory');
testInput('2x Arena of Glory');
testInput('1x Arena of Glory');
testInput('4 Lightning Bolt');
