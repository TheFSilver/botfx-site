"""botfx.fr — behaviour tests (the site works for a real visitor).

Usage:
  python3 build.py && python3 -m http.server 8891 --directory dist &
  python3 tests/test_site.py [base_url]   # default http://localhost:8891
"""
import sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8891"
HOST = urlparse(BASE).netloc
failures = []
# Cloudflare blocks the default Python-urllib agent in production (browser integrity check)
UA = {"User-Agent": "Mozilla/5.0 (botfx site test)"}

PAGES = ["/", "/outils/", "/mentions-legales/", "/confidentialite/"]


def check(cond, msg):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


def main_text(pg):
    return pg.locator("main").inner_text(timeout=2000) if pg.locator("main").count() else ""


def open_page(browser, path, **ctx):
    context = browser.new_context(**ctx)
    page = context.new_page()
    errors, foreign = [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("request", lambda r: urlparse(r.url).netloc not in (HOST, "") and not r.url.startswith("data:") and foreign.append(r.url))
    resp = page.goto(BASE + path, wait_until="networkidle")
    return context, page, resp, errors, foreign


with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")  # bundled Chromium crashes on macOS 26 (emoji/ImageIO)

    # --- Every page: loads, no JS error, no third-party request, no cookie, has an H1 + footer legal links
    for path in PAGES:
        print(f"[{path}]")
        ctx, pg, resp, errors, foreign = open_page(b, path, viewport={"width": 1440, "height": 900})
        check(resp is not None and resp.status == 200, f"{path} answers 200")
        check(not errors, f"{path} no JS/console error {errors[:2]}")
        check(not foreign, f"{path} no third-party request (no tracker, no Google Fonts) {foreign[:2]}")
        check(ctx.cookies() == [], f"{path} sets no cookie")
        check(pg.locator("h1").count() == 1 and pg.locator("h1").first.is_visible(), f"{path} one visible H1")
        check(pg.locator("html").get_attribute("lang") == "fr", f"{path} lang=fr")
        for net, url in (("LinkedIn", "https://www.linkedin.com/in/francois-dasylva/"), ("GitHub", "https://github.com/TheFSilver")):
            a = pg.locator(f"footer a[href='{url}']")
            check(a.count() == 1 and "me" in (a.get_attribute("rel") or "").split() and net in (a.get_attribute("aria-label") or a.inner_text()),
                  f"{path} footer links {net} (rel=me, accessible name)")
        for href in ("/mentions-legales/", "/confidentialite/"):
            check(pg.locator(f"footer a[href='{href}']").count() == 1, f"{path} footer links {href}")
        ctx.close()

    # --- Home: hero + CTA above the fold, 3 offers, contact
    print("[home desktop]")
    ctx, pg, *_ = open_page(b, "/", viewport={"width": 1440, "height": 900})
    cta = pg.locator("[data-cta-primary]")
    check(cta.count() == 1 and cta.is_visible(), "primary CTA visible")
    if cta.count():
        check(cta.bounding_box()["y"] + cta.bounding_box()["height"] < 900, "primary CTA above the fold")
        check((cta.get_attribute("href") or "").startswith("mailto:contact@botfx.fr"), "primary CTA mails contact@botfx.fr")
    offers = pg.locator("[data-offer]")
    check(offers.count() == 5, f"5 offers ({offers.count()})")
    text = main_text(pg).lower()
    for kw in ("wordpress", "automatisation", " ia", "pwa", "saas", "seo", "site", "maintenance", "web app"):
        check(kw in text, f"home mentions {kw}")
    # reveal animations must never leave content hidden
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(1500)
    hidden = pg.evaluate("[...document.querySelectorAll('[data-reveal]')].filter(e => getComputedStyle(e).opacity < 0.99).length")
    check(hidden == 0, f"all reveal blocks visible after scrolling ({hidden} hidden)")
    copy = pg.locator("[data-copy-email]")
    check(copy.count() == 1, "copy-email button present")
    if copy.count():
        ctx.grant_permissions(["clipboard-read", "clipboard-write"])
        copy.click()
        pg.wait_for_timeout(300)
        check(pg.evaluate("navigator.clipboard.readText()") == "contact@botfx.fr", "copy button copies the email")
        check("copi" in copy.inner_text().lower(), "copy button gives visible feedback")
    canvas = pg.locator("canvas[data-hero-canvas]")
    check(canvas.count() == 1, "hero canvas present")
    ctx.close()

    print("[home mobile]")
    ctx, m, *_ = open_page(b, "/", viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    sw = m.evaluate("document.documentElement.scrollWidth")
    check(sw <= 390, f"no horizontal scroll on mobile (scrollWidth={sw})")
    mc = m.locator("[data-cta-primary]")
    check(mc.count() == 1 and (mc.bounding_box() or {"y": 9999})["y"] < 844, "CTA above the fold on mobile")
    ctx.close()

    print("[reduced motion]")
    ctx, r, *_ = open_page(b, "/", viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    check(r.evaluate("document.documentElement.dataset.motion") == "reduced", "reduced-motion detected and honoured")
    hidden = r.evaluate("[...document.querySelectorAll('[data-reveal]')].filter(e => getComputedStyle(e).opacity < 0.99).length")
    check(hidden == 0, "reduced motion: nothing hidden waiting for an animation")
    ctx.close()

    # --- Mentions légales: LCEN + AI Act disclosure + affiliate disclosure
    print("[mentions légales]")
    ctx, ml, *_ = open_page(b, "/mentions-legales/")
    t = main_text(ml)
    for needle in ("François Dasylva", "Entrepreneur individuel", "53916294100022", "FR61539162941",
                   "77185 Lognes", "06 50 04 31 16", "contact@botfx.fr", "Cloudflare"):
        check(needle in t.replace(" ", " ").replace(" ", " "), f"mentions: {needle}")
    check("intelligence artificielle" in t.lower(), "mentions: AI usage disclosed")
    check("affili" in t.lower(), "mentions: affiliate links disclosed")
    ctx.close()

    print("[confidentialité]")
    ctx, cf, *_ = open_page(b, "/confidentialite/")
    t = main_text(cf).lower()
    check("dpo@botfx.fr" in t, "privacy: DPO contact")
    check("cnil" in t, "privacy: CNIL complaint right")
    check("cookie" in t, "privacy: cookie statement")
    ctx.close()

    # --- Outils: affiliate links are flagged
    print("[outils]")
    ctx, o, *_ = open_page(b, "/outils/")
    links = o.locator("a[data-tool]")
    check(links.count() >= 4, f"at least 4 tools listed ({links.count()})")
    bad = o.evaluate("[...document.querySelectorAll('a[data-tool]')].filter(a => !/sponsored/.test(a.rel)).length")
    check(bad == 0, "every tool link carries rel=sponsored")
    check("affili" in main_text(o).lower(), "outils: affiliate disclosure visible")
    ctx.close()


    # --- SEO: every page has title/description/canonical/OG, home has JSON-LD; robots + sitemap + og image + 404
    print("[seo]")
    import json, urllib.request
    for path in PAGES:
        ctx, pg, *_ = open_page(b, path)
        title = pg.title()
        check(10 <= len(title) <= 65, f"{path} title length ok ({len(title)}): {title}")
        desc = pg.locator("meta[name=description]").get_attribute("content") if pg.locator("meta[name=description]").count() else ""
        check(70 <= len(desc or "") <= 165, f"{path} meta description 70-165 chars ({len(desc or '')})")
        canon = pg.locator("link[rel=canonical]").get_attribute("href") if pg.locator("link[rel=canonical]").count() else ""
        check((canon or "").startswith("https://botfx.fr" + path.rstrip("/")) , f"{path} canonical -> botfx.fr ({canon})")
        for prop in ("og:title", "og:description", "og:image", "og:url"):
            check(pg.locator(f"meta[property='{prop}']").count() == 1, f"{path} {prop}")
        check(pg.locator("link[rel=icon]").count() >= 1, f"{path} favicon")
        if path == "/":
            ld = pg.locator("script[type='application/ld+json']")
            ok = False
            if ld.count():
                try:
                    data = json.loads(ld.first.inner_text()); ok = "@context" in json.dumps(data)
                except Exception:
                    ok = False
            check(ok, "home JSON-LD present and valid")
            same = json.dumps(data.get("sameAs", [])) if ok else ""
            check("linkedin.com/in/francois-dasylva" in same and "github.com/TheFSilver" in same, "JSON-LD sameAs links LinkedIn + GitHub")
        ctx.close()
    for path in ("/robots.txt", "/sitemap.xml", "/assets/og.png"):
        try:
            code = urllib.request.urlopen(urllib.request.Request(BASE + path, headers=UA)).status
        except Exception as e:
            code = getattr(e, "code", 0)
        check(code == 200, f"{path} served ({code})")
    try:
        urllib.request.urlopen(urllib.request.Request(BASE + "/nope-404-test/", headers=UA))
        code = 200
    except Exception as e:
        code = getattr(e, "code", 0)
    check(code == 404, f"unknown url -> 404 ({code})")

    # --- Accessibility: axe-core on every page (WCAG 2.2 AA), zero violation
    print("[a11y axe]")
    import os
    AXE = os.path.expanduser("~/Documents/Claude/aequa-check/node_modules/axe-core/axe.min.js")
    for path in PAGES:
        ctx, pg, *_ = open_page(b, path, viewport={"width": 1440, "height": 900}, reduced_motion="reduce", bypass_csp=True)  # axe is injected inline; prod CSP blocks it (good)
        pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(400)
        pg.add_script_tag(path=AXE)
        res = pg.evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}})")
        v = [(x["id"], len(x["nodes"])) for x in res["violations"]]
        check(not v, f"{path} axe: 0 violation {v}")
        ctx.close()

    # --- first viewport is never semi-transparent at load (scanners measure contrast mid-fade)
    print("[first viewport opaque at load]")
    for path in PAGES:
        ctx = b.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        pg.goto(BASE + path, wait_until="domcontentloaded")
        pg.wait_for_timeout(120)
        faded = pg.evaluate("""[...document.querySelectorAll('main *')].filter(e => {
            const r = e.getBoundingClientRect();
            if (r.top >= innerHeight || r.bottom <= 0 || !e.textContent.trim()) return false;
            let n = e, o = 1; while (n && n !== document.body) { o *= +getComputedStyle(n).opacity; n = n.parentElement; }
            return o < 0.99;
        }).map(e => e.tagName + '.' + e.className).slice(0, 4)""")
        check(not faded, f"{path} first viewport fully opaque at load {faded}")
        ctx.close()

    # --- WCAG 2.2.2: animations can be paused by the visitor
    print("[pause motion]")
    ctx, pm, *_ = open_page(b, "/", viewport={"width": 1440, "height": 900})
    tog = pm.locator("[data-motion-toggle]")
    check(tog.count() == 1, "motion toggle present")
    if tog.count():
        check(tog.get_attribute("aria-pressed") == "false", "toggle starts unpressed")
        tog.click()
        check(tog.get_attribute("aria-pressed") == "true", "toggle becomes pressed")
        check(pm.evaluate("document.documentElement.dataset.motion") == "reduced", "toggle pauses animations")
        state = pm.evaluate("getComputedStyle(document.querySelector('.marquee-track')).animationPlayState")
        check(state == "paused", f"marquee paused ({state})")
        pm.reload(wait_until="networkidle")
        check(pm.evaluate("document.documentElement.dataset.motion") == "reduced", "pause choice persists after reload")
    ctx.close()

    b.close()

# HSTS must not cover subdomains: webmail/* point to OVH, which has no botfx certificate
from pathlib import Path
hdr = (Path(__file__).resolve().parents[1] / "dist" / "_headers").read_text()
check("Strict-Transport-Security" in hdr, "HSTS header present")
check("includeSubDomains" not in hdr, "HSTS does not lock subdomains (webmail on OVH)")

print(f"\n{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
