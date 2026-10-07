import { execSync } from 'child_process';
execSync("python3 -c \"import pypdfium2 as pdfium; pdf = pdfium.PdfDocument('src/silhouette-card-maker-3.0.0/calibration/letter-calibration.pdf'); print(len(pdf))\"", {stdio: 'inherit'});
