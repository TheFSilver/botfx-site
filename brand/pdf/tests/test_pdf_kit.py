"""botfx PDF kit — behaviour test: the sample SEO report actually renders as a branded PDF.

Usage: python3 brand/pdf/tests/test_pdf_kit.py
"""
import subprocess
import sys
from pathlib import Path

from pypdf import PdfReader

KIT = Path(__file__).resolve().parents[1]
OUT = KIT / "output" / "exemple-rapport-seo.pdf"
failures = []


def check(cond, msg):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


# 1. the generator runs end to end on the sample data
OUT.unlink(missing_ok=True)
r = subprocess.run([sys.executable, str(KIT / "generate_report.py"), str(KIT / "examples" / "rapport_seo.json"), str(OUT)],
                   capture_output=True, text=True)
check(r.returncode == 0, f"generator exits 0 {r.stderr[-400:]}")
check(OUT.exists() and OUT.stat().st_size > 20_000, "PDF written")

if OUT.exists():
    pdf = PdfReader(str(OUT))
    pages = [p.extract_text() or "" for p in pdf.pages]
    full = "\n".join(pages)

    # 2. structure: cover + toc + sections + back cover
    check(len(pages) >= 5, f"at least 5 pages ({len(pages)})")
    w, h = float(pdf.pages[0].mediabox.width), float(pdf.pages[0].mediabox.height)
    check(abs(w - 595.3) < 2 and abs(h - 841.9) < 2, f"A4 portrait ({w:.0f}x{h:.0f})")
    check("Rapport" in pages[0] and "exemple-client.fr" in pages[0], "cover shows title + client domain")
    check("Page" not in pages[0], "cover has no running footer")
    check("Page 2 /" in pages[1], "inner pages have 'Page X / Y' footer")
    check(all("RAPPORT D'ACTIONS SEO" in p.upper() and "EXEMPLE-CLIENT.FR" in p.upper() for p in pages[1:-1]),
          "inner pages carry the running title (doc + domain)")
    check("botfx.fr" in pages[-1] and "contact@botfx.fr" in pages[-1], "back cover shows botfx contact")
    check("Page" not in pages[-1], "back cover has no running footer")

    # 3. content from data is rendered (actions, KPIs, before/after)
    for needle in ("Synthèse", "Actions menées", "Résultats", "Prochaines étapes", "Balises title", "+38"):
        check(needle in full, f"content: {needle}")

    # 4. brand fonts embedded (Geist + Geist Mono), no fallback font
    fonts = subprocess.run(["pdffonts", str(OUT)], capture_output=True, text=True).stdout
    check("Geist" in fonts, "Geist embedded")
    check("GeistMono" in fonts or "Geist Mono" in fonts or "Geist-Mono" in fonts, "Geist Mono embedded")
    bad = [l for l in fonts.splitlines()[2:] if l.strip() and "Geist" not in l]
    check(not bad, f"no fallback font {bad[:2]}")

    # 4b. score bars actually draw a filled bar (pixel check on the Synthèse page)
    import tempfile, glob as _g
    from PIL import Image
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["pdftoppm", "-r", "50", "-png", "-f", "3", "-l", "3", str(OUT), td + "/s"], check=True)
        im = Image.open(_g.glob(td + "/s*.png")[0]).convert("L")
        W, H = im.size
        dark_runs = 0
        for y in range(int(H * .35), int(H * .6)):
            run = best = 0
            for x in range(int(W * .3), int(W * .8)):
                run = run + 1 if im.getpixel((x, y)) < 60 else 0
                best = max(best, run)
            dark_runs += best > W * .15
        check(dark_runs >= 4, f"score bars are filled ({dark_runs} filled rows)")

    # 5. reasonable size (subsetting on)
    check(OUT.stat().st_size < 1_500_000, f"PDF < 1.5 MB ({OUT.stat().st_size // 1024} KB)")

print(f"\n{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
