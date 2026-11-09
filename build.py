#!/usr/bin/env python3
"""Assemble les pages statiques depuis src/pages/*.html + le gabarit commun.

Chaque page source commence par un bloc de métadonnées :
    <!--
    title: ...
    description: ...
    path: /outils/
    -->
puis le contenu de <main>. Sortie : dist/<path>/index.html (+ 404.html, assets, sitemap, robots, _headers).
Usage : python3 build.py
"""
import datetime
import hashlib
import html
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
SITE = "https://botfx.fr"

# Script inline anti-flash : détecte la préférence de mouvement avant le rendu.
BOOT = ("(function(){var d=document.documentElement;d.classList.add('js');var r=false;"
        "try{var m=localStorage.getItem('botfx-motion');r=m==='reduced'||(m!=='full'&&matchMedia('(prefers-reduced-motion: reduce)').matches)}"
        "catch(e){r=matchMedia('(prefers-reduced-motion: reduce)').matches}if(r)d.dataset.motion='reduced'})()")
BOOT_HASH = "sha256-" + __import__("base64").b64encode(hashlib.sha256(BOOT.encode()).digest()).decode()

JSONLD = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": SITE + "/#botfx",
    "name": "botfx",
    "url": SITE + "/",
    "email": "contact@botfx.fr",
    "image": SITE + "/assets/og.png",
    "description": "Sites sur mesure (HTML, CSS, JS) et SEO, web apps, PWA et SaaS, plugins et maintenance WordPress, automatisation (n8n, API) et IA appliquée pour indépendants et PME.",
    "areaServed": {"@type": "Country", "name": "France"},
    "address": {"@type": "PostalAddress", "streetAddress": "960 avenue de la Résistance", "addressLocality": "Saint-Paul-lès-Dax", "postalCode": "40990", "addressCountry": "FR"},
    "founder": {"@type": "Person", "name": "François Dasylva", "jobTitle": "Développeur web indépendant — sites, web apps, WordPress, automatisation et IA"},
    "vatID": "FR61539162941",
    "sameAs": ["https://www.linkedin.com/in/francois-dasylva/", "https://github.com/TheFSilver"],
    "knowsAbout": ["Développement web", "HTML", "CSS", "JavaScript", "PWA", "SaaS", "SEO", "WordPress", "Développement de plugins", "n8n", "Automatisation", "API", "Intelligence artificielle", "Accessibilité", "RGPD"],
    "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Services", "itemListElement": [
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Web apps, PWA et SaaS"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Sites sur mesure et SEO"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Plugins et maintenance WordPress"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Automatisation des opérations (n8n, API)"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "IA appliquée et agents"}},
    ]},
}

NAV = [("/services/", "Services"), ("/realisations/", "Réalisations"), ("/#cercle", "Le cercle"), ("/#machine", "Jouer"), ("/outils/", "Outils")]

FOOT_MAP = [
    ("/services/automatisation-n8n/", "Automatisation n8n"),
    ("/services/creation-site-sur-mesure/", "Sites sur mesure"),
    ("/services/web-app-pwa-saas/", "Web apps, PWA, SaaS"),
    ("/services/wordpress-plugins-maintenance/", "WordPress"),
    ("/services/ia-agents-entreprise/", "IA et agents"),
    ("/realisations/", "Réalisations"),
    ("/developpeur-web-dax-landes/", "Dax et Landes"),
]


def asset(rel):
    """URL versionnée : chaque build change l'adresse des fichiers modifiés, aucun navigateur ne garde l'ancienne version."""
    return f"/{rel}?v={hashlib.sha256((DIST / rel).read_bytes()).hexdigest()[:10]}"


def typo(fragment):
    """Espaces insécables du français, seulement dans le texte (jamais dans les balises)."""
    def fix(m):
        t = re.sub(r"(?:(?<=\S)|^) ([:;!?»])", "\u00a0\\1", m.group(0))
        return t.replace("« ", "«\u00a0")
    return re.sub(r"(?<=>)[^<]+(?=<)", fix, fragment)


def include(fragment):
    pattern = r"\{\{> *([\w-]+) *\}\}"
    while re.search(pattern, fragment):
        fragment = re.sub(pattern, lambda m: (ROOT / "src/partials" / f"{m.group(1)}.html").read_text().strip(), fragment)
    return fragment


def parse_fil(meta):
    """`fil: Services=/services/; Automatisation` -> [(nom, url|None), ...]"""
    out = [("Accueil", "/")]
    for part in (p.strip() for p in meta.get("fil", "").split(";") if p.strip()):
        name, _, href = part.partition("=")
        out.append((name.strip(), href.strip() or None))
    return out if len(out) > 1 else []


def crumbs_html(meta):
    fil = parse_fil(meta)
    if not fil:
        return ""
    items = "".join(f'<li><a href="{h}">{n}</a></li>' if h else f'<li aria-current="page">{n}</li>' for n, h in fil)
    return f'<nav class="crumbs" aria-label="Fil d\'Ariane"><ol>{items}</ol></nav>'


def plain(fragment):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment)).replace("\u00a0", " ")).strip()


def jsonld_blocks(meta, main_html, home):
    url = SITE + meta["path"]
    blocks = []
    if home or meta.get("ld") == "business":
        blocks.append(JSONLD)
    fil = parse_fil(meta)
    if fil:
        blocks.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + h if h else url} for i, (n, h) in enumerate(fil)]})
    if meta.get("service"):
        blocks.append({"@context": "https://schema.org", "@type": "Service", "name": meta["service"], "serviceType": meta["service"],
                       "url": url, "description": meta["description"], "areaServed": {"@type": "Country", "name": "France"},
                       "provider": {"@type": "ProfessionalService", "@id": SITE + "/#botfx", "name": "botfx", "url": SITE + "/"}})
    qa = re.findall(r'<details class="faq"[^>]*>\s*<summary>(.*?)</summary>\s*<div class="rep">(.*?)</div>\s*</details>', main_html, re.S)
    if qa:
        blocks.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in qa]})
    return "".join(f'<script type="application/ld+json">{json.dumps(b, ensure_ascii=False)}</script>' for b in blocks)


def last_modified(src):
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", str(src)], cwd=ROOT, capture_output=True, text=True, timeout=10).stdout.strip()
        dirty = subprocess.run(["git", "status", "--porcelain", "--", str(src)], cwd=ROOT, capture_output=True, text=True, timeout=10).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        out, dirty = "", ""
    return out if out and not dirty else datetime.date.today().isoformat()


def page_html(meta, main, home=False):
    path = meta["path"]
    url = SITE + path
    nav = "".join(f'<a href="{h}">{l}</a>' for h, l in NAV)
    foot_map = "".join(f'<a href="{h}">{l}</a>' for h, l in FOOT_MAP)
    ld = jsonld_blocks(meta, main, home)
    main = typo(main.replace("{{crumbs}}", crumbs_html(meta)))
    play_css = f'<link rel="stylesheet" href="{asset("assets/css/play.css")}">' if "data-play" in main else ""
    play_js = f'<script src="{asset("assets/js/play.js")}" defer></script>' if "data-play" in main else ""
    robots = '<meta name="robots" content="noindex">' if meta.get("noindex") else ""
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{meta['title']}</title>
<meta name="description" content="{meta['description']}">
<link rel="canonical" href="{url}">
{robots}
<meta name="theme-color" content="#050506">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="botfx">
<meta property="og:title" content="{meta['title']}">
<meta property="og:description" content="{meta['description']}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="botfx — sites, web apps, automatisation et IA">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{asset('assets/css/site.css')}">
{play_css}
<script>{BOOT}</script>
{ld}
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="top">
  <div class="wrap">
    <a class="logo" href="/" aria-label="botfx — accueil"><i aria-hidden="true"></i>botfx</a>
    <button type="button" class="menu-btn" data-menu-toggle aria-expanded="false" aria-controls="menu-principal"><span class="sr-only">Menu</span><i aria-hidden="true"></i><i aria-hidden="true"></i></button>
    <nav class="nav" id="menu-principal" aria-label="Navigation principale">{nav}<a class="nav-cta" href="/#contact">Contact</a></nav>
  </div>
  <span class="read-bar" aria-hidden="true"></span>
</header>
<main id="contenu">
{main}
</main>
<footer>
  <div class="wrap foot-map-wrap"><nav class="foot-map" aria-label="Plan du site">{foot_map}</nav></div>
  <div class="wrap">
    <p>© 2026 botfx — François Dasylva, entrepreneur individuel</p>
    <nav aria-label="Liens légaux">
      <a class="social" href="https://www.linkedin.com/in/francois-dasylva/" rel="me noopener" target="_blank" aria-label="LinkedIn (nouvel onglet)"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3zM9.5 9.75h3.8v1.6h.06c.53-1 1.82-2.05 3.75-2.05 4 0 4.74 2.64 4.74 6.07V21h-4v-4.98c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.92 1.3-1.92 2.63V21h-4z"/></svg></a>
      <a class="social" href="https://github.com/TheFSilver" rel="me noopener" target="_blank" aria-label="GitHub (nouvel onglet)"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5z"/></svg></a>
      <a href="/outils/">Outils</a>
      <a href="/mentions-legales/">Mentions légales</a>
      <a href="/confidentialite/">Confidentialité</a>
      <button type="button" class="motion-toggle" data-motion-toggle aria-pressed="false"><span class="ico" aria-hidden="true"></span><span data-label>Mettre en pause les animations</span></button>
    </nav>
  </div>
</footer>
<script src="{asset('assets/js/site.js')}" defer></script>
{play_js}
</body>
</html>
"""


def parse(src):
    m = re.match(r"\s*<!--(.*?)-->(.*)", src, re.S)
    meta = dict(line.split(":", 1) for line in m.group(1).strip().splitlines())
    return {k.strip(): v.strip() for k, v in meta.items()}, m.group(2).strip()


def main():
    import shutil
    shutil.rmtree(DIST, ignore_errors=True)
    shutil.copytree(ROOT / "assets", DIST / "assets")
    urls, llms = [], []
    for src in sorted((ROOT / "src/pages").glob("*.html")):
        meta, main_html = parse(src.read_text())
        main_html = include(main_html)
        out = DIST / "404.html" if src.stem == "404" else DIST / meta["path"].lstrip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page_html(meta, main_html, home=meta["path"] == "/"))
        if not meta.get("noindex"):
            urls.append((SITE + meta["path"], last_modified(src)))
            llms.append(f"- [{meta['title']}]({SITE + meta['path']}) : {meta['description']}")
        print("built", out.relative_to(DIST))
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>\n" for u, d in urls) + "</urlset>\n")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    (DIST / "llms.txt").write_text(
        "# botfx\n\n> Studio indépendant de François Dasylva : sites sur mesure et SEO, web apps, PWA et SaaS, "
        "plugins et maintenance WordPress, automatisation (n8n, API) et IA appliquée pour indépendants et PME, en France.\n\n"
        "## Pages\n\n" + "\n".join(llms) + "\n\n## Contact\n\n- contact@botfx.fr\n")
    csp = ("default-src 'self'; script-src 'self' '" + BOOT_HASH + "'; style-src 'self' 'unsafe-inline'; "
           "img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
    (DIST / "_headers").write_text(f"""/*
  Content-Security-Policy: {csp}
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin

/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/assets/css/*
  Cache-Control: public, max-age=3600, must-revalidate

/assets/js/*
  Cache-Control: public, max-age=3600, must-revalidate
""")
    print("built sitemap.xml robots.txt llms.txt _headers")


if __name__ == "__main__":
    main()
