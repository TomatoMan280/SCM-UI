import pypdfium2 as pdfium
from PIL import Image, JpegImagePlugin

def test():
    pdf = pdfium.PdfDocument('src/silhouette-card-maker-main/calibration/letter-calibration.pdf')
    page = pdf.get_page(0)
    img = page.render(300/72).to_pil()
    img.save("test_before.pdf")
    print(f"Mode before: {img.mode}")

    # composite on white background
    white = Image.new("RGB", img.size, (255, 255, 255))
    if img.mode == 'RGBA':
        white.paste(img, mask=img.split()[3])
    else:
        white = img.convert("RGB")

    white.save("test_after.pdf")
    print("Saved test_after.pdf")

if __name__ == '__main__':
    test()
