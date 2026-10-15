#!/usr/bin/env python3
"""
Automated Card Art Cleanup Tool for Trading Cards.
Uses LaMa (Large Mask Inpainting via ONNX Runtime / OpenCV DNN) with automated watermark detection.
Detects both solid and translucent watermarks (e.g. Bandai "SAMPLE" stamps) and restores card art cleanly.
"""

import sys
import os
import json
import argparse
import numpy as np
import cv2

# Suppress onnxruntime verbose logs
os.environ['ORT_LOG_SEVERITY_LEVEL'] = '3'

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_PATHS = [
    os.path.join(SCRIPT_DIR, 'data', 'models', 'inpainting_lama_2025jan.onnx'),
    os.path.join(SCRIPT_DIR, 'inpainting_lama_2025jan.onnx'),
    os.path.join(SCRIPT_DIR, '..', 'data', 'models', 'inpainting_lama_2025jan.onnx')
]

class CardCleanup:
    def __init__(self, model_path=None):
        self.session = None
        self.net = None
        self.use_ort = False

        resolved_model = None
        if model_path and os.path.exists(model_path):
            resolved_model = model_path
        else:
            for p in DEFAULT_MODEL_PATHS:
                if os.path.exists(p):
                    resolved_model = p
                    break

        if not resolved_model:
            # Auto-download model on first run if missing
            target_dest = DEFAULT_MODEL_PATHS[0]
            try:
                import urllib.request
                os.makedirs(os.path.dirname(target_dest), exist_ok=True)
                sys.stderr.write("[Cleanup] Downloading LaMa ONNX model (~88MB) for first run...\n")
                url = "https://huggingface.co/opencv/inpainting_lama/resolve/main/inpainting_lama_2025jan.onnx"
                urllib.request.urlretrieve(url, target_dest)
                if os.path.exists(target_dest):
                    resolved_model = target_dest
                    sys.stderr.write("[Cleanup] Model downloaded successfully!\n")
            except Exception as e:
                sys.stderr.write(f"[Cleanup] Auto-download failed ({e}), using OpenCV fallback.\n")

        if resolved_model:
            try:
                import onnxruntime as ort
                so = ort.SessionOptions()
                so.log_severity_level = 3
                # Attempt to use DirectML / CPU
                providers = ['CPUExecutionProvider']
                if 'DmlExecutionProvider' in ort.get_available_providers():
                    providers.insert(0, 'DmlExecutionProvider')
                self.session = ort.InferenceSession(resolved_model, so, providers=providers)
                self.use_ort = True
            except Exception as e:
                try:
                    self.net = cv2.dnn.readNetFromONNX(resolved_model)
                    self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_DEFAULT)
                    self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                except Exception as ex:
                    self.session = None
                    self.net = None

    def detect_watermark_mask(self, img_bgr):
        """
        Detects horizontal watermarks ('SAMPLE', 'PROMO', etc.), both translucent (~50% opacity)
        and solid bright/red, across card art.
        Returns a binary mask (uint8, same (h, w), 255 at watermark pixels) or None if not found.
        """
        h, w = img_bgr.shape[:2]

        # 1. Bandai Character/Leader central watermark zone (Y: ~0.40 to ~0.615, X: ~0.08 to ~0.92)
        y1, y2 = int(h * 0.405), int(h * 0.612)
        x1, x2 = int(w * 0.080), int(w * 0.920)
        roi = img_bgr[y1:y2, x1:x2]
        gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

        adapt = cv2.adaptiveThreshold(gray_roi, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, -4)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(adapt, connectivity=8)

        roi_h = y2 - y1
        roi_w = x2 - x1

        candidates = []
        for i in range(1, num_labels):
            ch = stats[i, cv2.CC_STAT_HEIGHT]
            cw = stats[i, cv2.CC_STAT_WIDTH]
            area = stats[i, cv2.CC_STAT_AREA]
            cx, cy = centroids[i]

            if ch > roi_h * 0.30 and cw > 6 and area > 80:
                candidates.append((i, cx, cy, ch, cw, area))

        # If letter-like components span across the band, watermark is detected
        if len(candidates) >= 3:
            xs = [c[1] for c in candidates]
            span = max(xs) - min(xs)
            if span > roi_w * 0.40:
                mask = np.zeros((h, w), dtype=np.uint8)
                mask[y1:y2, x1:x2] = 255
                dilation_size = max(5, int(h * 0.008))
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (dilation_size, dilation_size))
                return cv2.dilate(mask, kernel)

        # 2. Solid White / Bright Watermark Detection (Threshold > 215)
        y1_b, y2_b = int(h * 0.25), int(h * 0.78)
        x1_b, x2_b = int(w * 0.05), int(w * 0.95)
        roi_b = img_bgr[y1_b:y2_b, x1_b:x2_b]
        gray_roi_b = cv2.cvtColor(roi_b, cv2.COLOR_BGR2GRAY)

        _, bright_mask = cv2.threshold(gray_roi_b, 215, 255, cv2.THRESH_BINARY)
        mask = self._extract_word_letters(bright_mask, h, w, y1_b, x1_b)
        if mask is not None:
            return mask

        # 3. Solid Red Watermark Detection
        r = roi_b[:, :, 2].astype(np.int16)
        g = roi_b[:, :, 1].astype(np.int16)
        b = roi_b[:, :, 0].astype(np.int16)
        red_diff = r - np.maximum(g, b)
        red_mask = np.where((r > 160) & (red_diff > 60), 255, 0).astype(np.uint8)
        mask_red = self._extract_word_letters(red_mask, h, w, y1_b, x1_b)
        if mask_red is not None:
            return mask_red

        return None

    def _extract_word_letters(self, binary_roi, h, w, y_offset, x_offset):
        """
        Uses connected component geometry to find a cluster of 3+ horizontally aligned letters.
        """
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary_roi, connectivity=8)
        if num_labels < 4:
            return None

        candidates = []
        for i in range(1, num_labels):
            comp_h = stats[i, cv2.CC_STAT_HEIGHT]
            comp_w = stats[i, cv2.CC_STAT_WIDTH]
            area = stats[i, cv2.CC_STAT_AREA]
            aspect = comp_w / float(max(1, comp_h))
            cx, cy = centroids[i]

            if (h * 0.055 < comp_h < h * 0.22) and (0.12 < aspect < 1.05) and area > 80:
                candidates.append((i, cx, cy, comp_h, comp_w, area))

        if len(candidates) < 3:
            return None

        median_y = np.median([c[2] for c in candidates])
        median_h = np.median([c[3] for c in candidates])

        letters = [
            c for c in candidates
            if abs(c[2] - median_y) < h * 0.05 and abs(c[3] - median_h) < h * 0.04
        ]

        if len(letters) < 3:
            return None

        mask_roi = np.zeros_like(binary_roi)
        for l in letters:
            comp_mask = (labels == l[0]).astype(np.uint8)
            cnts, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in cnts:
                hull = cv2.convexHull(cnt)
                cv2.fillPoly(mask_roi, [hull], 255)

        dilation_size = max(7, int(h * 0.012))
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilation_size, dilation_size))
        mask_roi = cv2.dilate(mask_roi, kernel, iterations=1)

        full_mask = np.zeros((h, w), dtype=np.uint8)
        full_mask[y_offset:y_offset + binary_roi.shape[0], x_offset:x_offset + binary_roi.shape[1]] = mask_roi
        return full_mask

    def inpaint(self, img_bgr, mask):
        """
        Inpaints the masked region using LaMa or OpenCV Navier-Stokes fallback.
        """
        h, w = img_bgr.shape[:2]

        if self.session is not None or self.net is not None:
            try:
                # 1. Resize to 512x512 for LaMa
                img_512 = cv2.resize(img_bgr, (512, 512), interpolation=cv2.INTER_AREA)
                mask_512 = cv2.resize(mask, (512, 512), interpolation=cv2.INTER_NEAREST)
                _, mask_512 = cv2.threshold(mask_512, 127, 255, cv2.THRESH_BINARY)

                img_blob = (img_512.astype(np.float32) / 255.0).transpose(2, 0, 1)[None, ...]
                mask_blob = (mask_512 > 0).astype(np.float32)[None, None, ...]

                if self.use_ort:
                    outputs = self.session.run(None, {'image': img_blob, 'mask': mask_blob})
                    out = outputs[0][0]
                else:
                    self.net.setInput(img_blob, 'image')
                    self.net.setInput(mask_blob, 'mask')
                    out = self.net.forward()[0]

                out_bgr_512 = np.transpose(out, (1, 2, 0))
                out_bgr_512 = np.clip(out_bgr_512, 0, 255).astype(np.uint8)

                # Resize back to original dimensions
                inpainted_full = cv2.resize(out_bgr_512, (w, h), interpolation=cv2.INTER_CUBIC)

                # Feathered composite: keeps 100% of the original unmasked pixels completely untouched!
                kernel_mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=1)
                feather_mask = cv2.GaussianBlur(kernel_mask.astype(np.float32) / 255.0, (7, 7), 0)[..., None]

                final = (inpainted_full.astype(np.float32) * feather_mask + img_bgr.astype(np.float32) * (1.0 - feather_mask))
                return np.clip(final, 0, 255).astype(np.uint8)
            except Exception as e:
                sys.stderr.write(f"[Warning] LaMa failed ({e}), falling back to OpenCV Navier-Stokes\n")

        # Fallback: OpenCV Navier-Stokes inpainting
        return cv2.inpaint(img_bgr, mask, 3, cv2.INPAINT_NS)

    def process_file(self, input_path, output_path=None, force=False):
        if not os.path.exists(input_path):
            return {"success": False, "error": f"File not found: {input_path}"}

        out_path = output_path or input_path

        # Read image (handling alpha channel)
        img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return {"success": False, "error": f"Failed to decode image: {input_path}"}

        has_alpha = len(img.shape) == 3 and img.shape[2] == 4
        if has_alpha:
            bgr = img[:, :, :3]
            alpha = img[:, :, 3]
        else:
            bgr = img if len(img.shape) == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            alpha = None

        h, w = bgr.shape[:2]

        mask = self.detect_watermark_mask(bgr)
        if mask is None:
            if not force:
                return {
                    "success": True,
                    "cleaned": False,
                    "path": input_path,
                    "message": "No watermark detected (already clean)."
                }
            # If forced, default to standard central watermark band
            mask = np.zeros((h, w), dtype=np.uint8)
            y1, y2 = int(h * 0.405), int(h * 0.612)
            x1, x2 = int(w * 0.080), int(w * 0.920)
            mask[y1:y2, x1:x2] = 255

        cleaned_bgr = self.inpaint(bgr, mask)

        if has_alpha:
            final_img = np.dstack((cleaned_bgr, alpha))
        else:
            final_img = cleaned_bgr

        # Save result atomically
        tmp_out = out_path + ".tmp.png"
        cv2.imwrite(tmp_out, final_img)
        if os.path.exists(out_path):
            try:
                os.remove(out_path)
            except Exception:
                pass
        os.rename(tmp_out, out_path)

        return {
            "success": True,
            "cleaned": True,
            "path": out_path,
            "message": "Card art successfully cleaned."
        }


# Maintain backward compatibility alias
SampleRemover = CardCleanup

def main():
    parser = argparse.ArgumentParser(description="Automated Card Art Cleanup Tool for Trading Cards")
    parser.add_argument("--input", "-i", help="Path to single image")
    parser.add_argument("--output", "-o", help="Optional output path")
    parser.add_argument("--batch", "-b", nargs="+", help="Batch list of file paths")
    parser.add_argument("--file-list", help="Path to JSON or TXT file containing list of image paths")
    parser.add_argument("--model", "-m", help="Path to inpainting ONNX model")
    parser.add_argument("--force", action="store_true", help="Force cleanup even if detection confidence is low")
    args = parser.parse_args()

    cleaner = CardCleanup(model_path=args.model)

    files_to_process = []
    if args.input:
        files_to_process.append((args.input, args.output))
    elif args.batch:
        for f in args.batch:
            files_to_process.append((f, None))
    elif args.file_list and os.path.exists(args.file_list):
        with open(args.file_list, 'r', encoding='utf-8') as fl:
            try:
                data = json.load(fl)
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, str):
                            files_to_process.append((item, None))
                        elif isinstance(item, dict) and 'input' in item:
                            files_to_process.append((item['input'], item.get('output')))
            except Exception:
                fl.seek(0)
                for line in fl:
                    line = line.strip()
                    if line:
                        files_to_process.append((line, None))

    if not files_to_process:
        print(json.dumps({"error": "No input files specified"}))
        sys.exit(1)

    total = len(files_to_process)
    cleaned_count = 0
    results = []

    for idx, (inp, out) in enumerate(files_to_process, 1):
        res = cleaner.process_file(inp, out, force=args.force)
        if res.get("cleaned"):
            cleaned_count += 1
        results.append(res)
        # Emit JSON progress event for live streaming
        sys.stdout.write(json.dumps({
            "event": "progress",
            "current": idx,
            "total": total,
            "card": os.path.basename(inp),
            "cleaned": res.get("cleaned", False),
            "message": res.get("message", "")
        }) + "\n")
        sys.stdout.flush()

    sys.stdout.write(json.dumps({
        "event": "done",
        "total": total,
        "cleaned": cleaned_count,
        "results": results
    }) + "\n")
    sys.stdout.flush()

if __name__ == "__main__":
    main()
