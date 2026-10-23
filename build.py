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
import hashlib
import json
import re
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
    "address": {"@type": "PostalAddress", "addressLocality": "Lognes", "postalCode": "77185", "addressCountry": "FR"},
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

NAV = [("/#services", "Services"), ("/#methode", "Méthode"), ("/outils/", "Outils")]


def page_html(meta, main, home=False):
    path = meta["path"]
    url = SITE + path
    nav = "".join(f'<a href="{h}">{l}</a>' for h, l in NAV)
    ld = f'<script type="application/ld+json">{json.dumps(JSONLD, ensure_ascii=False)}</script>' if home else ""
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
<meta property="og:image:alt" content="botfx — WordPress, automatisation et IA">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css">
<script>{BOOT}</script>
{ld}
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="top">
  <div class="wrap">
    <a class="logo" href="/" aria-label="botfx — accueil"><i aria-hidden="true"></i>botfx</a>
    <nav class="nav" aria-label="Navigation principale">{nav}<a class="nav-cta" href="/#contact">Contact</a></nav>
  </div>
</header>
<main id="contenu">
{main}
</main>
<footer>
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
<script src="/assets/js/site.js" defer></script>
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
    urls = []
    for src in sorted((ROOT / "src/pages").glob("*.html")):
        meta, main_html = parse(src.read_text())
        out = DIST / "404.html" if src.stem == "404" else DIST / meta["path"].lstrip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page_html(meta, main_html, home=meta["path"] == "/"))
        if not meta.get("noindex"):
            urls.append(SITE + meta["path"])
        print("built", out.relative_to(DIST))
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
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
    print("built sitemap.xml robots.txt _headers")


if __name__ == "__main__":
    main()
