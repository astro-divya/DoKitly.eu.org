DoKitly Build 3 — Full Site + Scanned PDF to Editable Word OCR

UPLOAD
1. Upload the CONTENTS of this ZIP to the repository root — do not upload an extra enclosing folder.
2. GitHub: Settings > Pages > Deploy from a branch > main > /(root).
3. Keep the existing repository/domain setup unless you intentionally change it.
4. If the final domain/repository path changes, update canonical URLs and sitemap.xml before indexing.

BUILD 3 PDF TO WORD UPGRADE
- Text-based PDFs: embedded/selectable text is extracted directly and reconstructed into editable DOCX content.
- Scanned/image-only PDFs: pages are detected automatically and processed with browser OCR (Tesseract.js).
- OCR output is rebuilt as editable Word text with best-effort line position, font size, spacing, page size and table reconstruction.
- OCR language selector: English or English + Hindi.
- If OCR cannot recover usable text from a scanned page, that page falls back to a full-page image instead of becoming blank.
- Word output is packaged as Word 2007-safe OOXML and re-open validated before download.
- Each source PDF page is preserved as a separate Word section with its source page dimensions.
- OCR runs in the browser. The first scanned conversion needs internet access to load the OCR library/language data and can take longer than a normal text PDF.

IMPORTANT
- This package uses the latest no-games DoKitly full-site package as its base.
- Other tools and site structure are preserved; the main functional change is the PDF to Word OCR upgrade.
- Complex scans, handwriting, unusual fonts, charts and very dense tables may still require manual cleanup in Word.
