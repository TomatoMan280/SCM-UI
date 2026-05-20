import pypdfium2 as pdfium
from PIL import Image, JpegImagePlugin

def test():
    pdf = pdfium.PdfDocument('src/silhouette-card-maker-main/calibration/letter-calibration.pdf')
    raw_images = []
    ppi = 300
    for page_number in range(len(pdf)):
        page = pdf.get_page(page_number)
        raw_images.append(page.render(ppi/72).to_pil())

    # convert to RGB
    final_images = []
    for img in raw_images:
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            final_images.append(background)
        else:
            final_images.append(img.convert('RGB'))
            
    final_images[0].save('test_offset.pdf', save_all=True, append_images=final_images[1:], resolution=ppi, speed=0, subsampling=0, quality=100)
    print("Saved test_offset.pdf")

if __name__ == '__main__':
    test()
