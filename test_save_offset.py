import pypdfium2 as pdfium
from PIL import Image, JpegImagePlugin
import math
from PIL import ImageChops
import os
import sys

def offset_images(images, x_offset, y_offset, ppi, angle_offset=0.0):
    result_images = []
    add_offset = False
    for image in images:
        if add_offset:
            result = ImageChops.offset(image, math.floor(-x_offset * ppi / 300), math.floor(y_offset * ppi / 300))
            if angle_offset != 0.0:
                result = result.rotate(-angle_offset, center=(image.width / 2, image.height / 2), fillcolor='white')
            result_images.append(result)
        else:
            result_images.append(image)
        add_offset = not add_offset
    return result_images

def test():
    pdf = pdfium.PdfDocument('src/silhouette-card-maker-main/calibration/letter-calibration.pdf')
    raw_images = []
    ppi = 300
    for page_number in range(len(pdf)):
        page = pdf.get_page(page_number)
        raw_images.append(page.render(ppi/72).to_pil())

    final_images = offset_images(raw_images, 4, 5, ppi, 0)
    
    # Do exactly what the code in offset_pdf.py does:
    final_images[0].save('test_offset_direct.pdf', save_all=True, append_images=final_images[1:], resolution=ppi, speed=0, subsampling=0, quality=100)

if __name__ == '__main__':
    test()
    print("Done")
