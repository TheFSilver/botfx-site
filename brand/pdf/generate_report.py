#!/usr/bin/env python3
"""Génère un PDF brandé botfx à partir d'un JSON de données.

Usage :
    python3 generate_report.py <donnees.json> <sortie.pdf> [--theme light|dark] [--template rapport_seo.html]

Le JSON fournit le contexte du template (voir examples/rapport_seo.json).
"""
import argparse
import json
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent
sys.path.insert(0, str(KIT))
from brand import score_to_grade, sphere_svg  # noqa: E402

ASSETS = KIT / "assets"
TEMPLATES = KIT / "templates"

# WeasyPrint ne résout pas var() dans @page : le thème sombre réécrit le fond et les marges en dur.
DARK_PAGE_CSS = """
@page { background: #050506;
  @top-left { color: #F5F5F6; } @top-right { color: #A3A7AE; }
  @bottom-left { color: #A3A7AE; } @bottom-center { color: #A3A7AE; } @bottom-right { color: #A3A7AE; } }
"""


def render(data: dict, template: str = "rapport_seo.html", theme: str = "light") -> str:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=select_autoescape(["html"]))
    env.filters["grade"] = lambda s: score_to_grade(float(s))
    ctx = {**data, "theme": theme,
           "sphere": sphere_svg(size=620, n=1600), "sphere_small": sphere_svg(size=460, n=1100)}
    html = env.get_template(template).render(**ctx)
    if theme == "dark":
        html = html.replace("</head>", f"<style>{DARK_PAGE_CSS}</style></head>", 1)
    return html


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("data"); ap.add_argument("output")
    ap.add_argument("--theme", choices=["light", "dark"], default="light")
    ap.add_argument("--template", default="rapport_seo.html")
    args = ap.parse_args(argv)
    try:
        from weasyprint import HTML
    except ImportError:
        sys.exit("Dépendances manquantes : pip install weasyprint jinja2")
    data = json.loads(Path(args.data).read_text(encoding="utf-8"))
    out = Path(args.output); out.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=render(data, args.template, args.theme), base_url=str(ASSETS)).write_pdf(str(out))
    print(f"PDF : {out} ({out.stat().st_size // 1024} Ko)")


if __name__ == "__main__":
    main()
