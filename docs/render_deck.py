# Render a .pptx to per-slide PNGs.
# Usage: python render_deck.py <pptx> <out_dir> [slide,slide,...]
# LibreOffice headless -> PDF, then PyMuPDF -> PNG (deterministic, no PowerPoint needed).
import sys, os, subprocess, glob

SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"

def render(pptx, out_dir, slides=None, dpi=130):
    os.makedirs(out_dir, exist_ok=True)
    pptx = os.path.abspath(pptx)
    # LibreOffice convert to PDF in out_dir
    subprocess.run([SOFFICE, "--headless", "--convert-to", "pdf",
                    "--outdir", out_dir, pptx], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pdf = os.path.join(out_dir, os.path.splitext(os.path.basename(pptx))[0] + ".pdf")
    import fitz
    doc = fitz.open(pdf)
    want = set(slides) if slides else set(range(1, doc.page_count + 1))
    written = []
    for i in range(doc.page_count):
        n = i + 1
        if n not in want:
            continue
        page = doc[i]
        pix = page.get_pixmap(dpi=dpi)
        path = os.path.join(out_dir, f"slide_{n:02d}.png")
        pix.save(path)
        written.append(path)
    doc.close()
    return written

if __name__ == "__main__":
    pptx = sys.argv[1]
    out_dir = sys.argv[2]
    slides = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else None
    for p in render(pptx, out_dir, slides):
        print("rendered", p)
