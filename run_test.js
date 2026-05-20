import { execSync } from 'child_process';
execSync("python3 -c \"import pypdfium2 as pdfium; import os; pdf = pdfium.PdfDocument('test_offset_direct.pdf'); print('Pages:', len(pdf), 'Size:', os.path.getsize('test_offset_direct.pdf'))\"", {stdio: 'inherit'});
