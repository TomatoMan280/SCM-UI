const { execSync } = require('child_process');
const fs = require('fs');

fs.writeFileSync('make_icon.py', `
from PIL import Image, ImageDraw
import math

size = 256
padding = 40
inner = size - padding*2

img = Image.new('RGBA', (size, size), (0,0,0,0))
draw = ImageDraw.Draw(img)

try:
    draw.rounded_rectangle([(padding, padding), (size-padding, size-padding)], radius=24, fill=(99, 102, 241, 255))
except:
    draw.rectangle([(padding, padding), (size-padding, size-padding)], fill=(99, 102, 241, 255))

w_size = 60
cx, cy = size//2, size//2
draw.rectangle([(cx - w_size//2, cy - w_size//2), (cx + w_size//2, cy + w_size//2)], fill=(255,255,255,255))

img.save('public/icon.png')
# Also save as ICO with multiple sizes for Windows
icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save('public/icon.ico', sizes=icon_sizes)

print('Padded icon generated as PNG and ICO!')
`);

execSync('python3 make_icon.py', { stdio: 'inherit' });
