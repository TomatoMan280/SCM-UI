import os
import sys

def process_icon():
    try:
        from PIL import Image
    except ImportError:
        print("[Icon Processor] PIL/Pillow is not installed. Skipping automatic icon padding.")
        return

    # Look for candidate source icons in order of preference
    candidates = [
        "build/icon.png",
        "icon.png",
        "dist/icon.png"
    ]

    source_path = None
    for path in candidates:
        if os.path.exists(path) and os.path.isfile(path):
            source_path = path
            break

    if not source_path:
        print("[Icon Processor] No custom icon.png found to process. Skipping.")
        return

    print(f"[Icon Processor] Processing custom logo found at: {source_path}")

    try:
        # Load the source image and convert to RGBA to preserve transparency
        with Image.open(source_path) as img:
            img = img.convert("RGBA")
            orig_w, orig_h = img.size
            print(f"[Icon Processor] Source icon size: {orig_w}x{orig_h}")

            # Define target dimension
            # 512x512 is the standard high-resolution icon template for Electron window/build pipelines
            target_dim = 512
            
            # Create a transparent square canvas
            new_img = Image.new("RGBA", (target_dim, target_dim), (0, 0, 0, 0))

            # Calculate safe content dimensions (80% of canvas to prevent squircle/edge clipping)
            safe_scale = 0.82
            if orig_w == orig_h:
                # Square logo
                new_w = int(target_dim * safe_scale)
                new_h = int(target_dim * safe_scale)
            else:
                # Maintain aspect ratio for rectangular logos
                ratio = min((target_dim * safe_scale) / orig_w, (target_dim * safe_scale) / orig_h)
                new_w = int(orig_w * ratio)
                new_h = int(orig_h * ratio)

            # Resize original image with high-quality Lankzos resampler
            try:
                resampler = Image.Resampling.LANCZOS
            except AttributeError:
                # Handle older Pillow versions
                resampler = Image.LANCZOS

            resized_img = img.resize((new_w, new_h), resampler)

            # Center the resized image on the canvas
            offset_x = (target_dim - new_w) // 2
            offset_y = (target_dim - new_h) // 2
            new_img.paste(resized_img, (offset_x, offset_y), resized_img)

            # Define destination paths
            dest_paths = [
                "build/icon.png",
                "dist/icon.png",
                "icon.png"
            ]

            # Ensure containing directories exist
            for dest_path in dest_paths:
                dirname = os.path.dirname(dest_path)
                if dirname and not os.path.exists(dirname):
                    os.makedirs(dirname, exist_ok=True)
                
                new_img.save(dest_path, "PNG")
                print(f"[Icon Processor] Saved padded icon to: {dest_path}")

            print("[Icon Processor] Custom 256x256 logo padded to safe bounds successfully.")

    except Exception as e:
        print(f"[Icon Processor] Failed to process icon: {e}", file=sys.stderr)

if __name__ == "__main__":
    process_icon()
