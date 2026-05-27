import fs from 'fs';
import path from 'path';
import pngToIco from 'png-to-ico';

async function processIcon() {
    const candidates = [
        "build/icon.png",
        "Build/icon.png",
        "icon.png",
        "Icon.png",
        "dist/icon.png",
        "dist/assets/icon.png"
    ];

    let sourcePath = null;
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            sourcePath = p;
            break;
        }
    }

    if (!sourcePath) {
        console.log("[Icon Processor] No custom icon.png found to process. Skipping.");
        // If not found, let's just make sure electron-builder doesn't fail 
        // by creating an empty ico or something, or just do nothing.
        return;
    }

    console.log(`[Icon Processor] Processing custom logo found at: ${sourcePath}`);

    try {
        const destPaths = [
            "build/icon.png",
            "Build/icon.png",
            "dist/icon.png",
            "icon.png"
        ];

        // For simplicity, we just copy the original PNG to dest paths if it's not already there.
        // We aren't doing the PIL padding here, but we will generate the ICO out of it.
        for (const dest of destPaths) {
            if (path.resolve(sourcePath) !== path.resolve(dest)) {
                const dir = path.dirname(dest);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.copyFileSync(sourcePath, dest);
            }
        }

        const bDirs = ["build", "Build"];
        for (const bDir of bDirs) {
            if (!fs.existsSync(bDir)) {
                fs.mkdirSync(bDir, { recursive: true });
            }

            const icoPath = path.join(bDir, "icon.ico");
            try {
                const buf = await pngToIco(sourcePath);
                fs.writeFileSync(icoPath, buf);
                console.log(`[Icon Processor] Generated Windows icon at: ${icoPath}`);
            } catch (err) {
                console.error(`[Icon Processor] Warning: Could not generate .ico file inside ${bDir}:`, err);
            }
        }
        console.log("[Icon Processor] Custom logo and platform-specific installers assets processed successfully.");
    } catch (e) {
        console.error("[Icon Processor] Failed to process icon:", e);
    }
}

processIcon();
