import fs from 'fs';
import { createCanvas } from 'canvas';

// generate a 256x256 image with some padding, say 32px padding all around.
// So the actual logo is 192x192.
const size = 256;
const padding = 32;
const innerSize = size - (padding * 2);

const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Transparent background
ctx.clearRect(0, 0, size, size);

// Draw rounded rectangle for logo
ctx.fillStyle = '#6366f1'; // primary-600
ctx.beginPath();
ctx.roundRect(padding, padding, innerSize, innerSize, 24);
ctx.fill();

// Draw something inside like two shapes for "Layers"
ctx.fillStyle = '#ffffff';
ctx.translate(padding + innerSize/2, padding + innerSize/2);
ctx.rotate(45 * Math.PI / 180);
ctx.globalAlpha = 0.8;
ctx.beginPath();
ctx.roundRect(-30, -30, 60, 60, 8);
ctx.fill();

ctx.rotate(-45 * Math.PI / 180);
ctx.globalAlpha = 1.0;
ctx.beginPath();
ctx.roundRect(-15, -45, 60, 60, 8);
ctx.fill();

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/icon.png', buffer);
console.log('Created padded icon into public/icon.png');
