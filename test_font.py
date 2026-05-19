from PIL import ImageFont
import os

font_path = "/src/silhouette-card-maker-main/assets/arial.ttf"
print(f"Checking {font_path}")
if os.path.exists(font_path):
    print("File exists")
    try:
        font = ImageFont.truetype(font_path, 40)
        print("Font loaded successfully")
    except Exception as e:
        print(f"Error loading font: {e}")
else:
    print("File does not exist")
