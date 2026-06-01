import { Jimp } from 'jimp';
import fs from 'fs';

(async () => {
    // Create a new 256x256 completely transparent image.
    const image = new Jimp({ width: 256, height: 256, color: 0x00000000 });
    const buf = await image.getBuffer('image/png');
    const paths = ["icon.png", "build/icon.png", "Build/icon.png", "dist/icon.png"];
    for (const p of paths) {
        fs.writeFileSync(p, buf);
        console.log("Wrote 256x256 to", p);
    }
})();
