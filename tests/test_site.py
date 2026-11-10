"""botfx.fr — behaviour tests (the site works for a real visitor).

Usage:
  python3 build.py && python3 -m http.server 8891 --directory dist &
  python3 tests/test_site.py [base_url]   # default http://localhost:8891
"""
import sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8891"
HOST = urlparse(BASE).netloc
failures = []
# Cloudflare blocks the default Python-urllib agent in production (browser integrity check)
UA = {"User-Agent": "Mozilla/5.0 (botfx site test)"}

SERVICES = ["/services/automatisation-n8n/", "/services/creation-site-sur-mesure/", "/services/web-app-pwa-saas/",
            "/services/wordpress-plugins-maintenance/", "/services/ia-agents-entreprise/"]
CASES = ["/realisations/automatisation-cabinet-de-paie/", "/realisations/application-pwa-infirmiers-liberaux/", "/realisations/automatisation-agence-web/"]
CONTENT = ["/services/", *SERVICES, "/realisations/", *CASES, "/developpeur-web-dax-landes/"]
PAGES = ["/", *CONTENT, "/outils/", "/mentions-legales/", "/confidentialite/"]


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
    for needle in ("François Dasylva", "Entrepreneur individuel", "53916294100030", "FR61539162941",
                   "40990 Saint-Paul-lès-Dax", "06 07 21 36 14", "contact@botfx.fr", "Cloudflare"):
        check(needle in t.replace(" ", " ").replace(" ", " "), f"mentions: {needle}")
    check(ml.locator("a[href='tel:+33607213614']").count() == 1, "mentions: phone link is the current number")
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
    check(o.locator("a[data-tool][href*='indy.fr']").get_attribute("href") == "https://www.indy.fr/?ae=2101", "Indy link carries the affiliate code")
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

    # --- Terrain de jeu : chaque jouet réagit vraiment au visiteur
    VIEW = {"width": 1440, "height": 900}

    print("[sphère + pilote automatique]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    c = pg.locator("canvas[data-hero-canvas]")
    box = pg.evaluate("(()=>{const c=document.querySelector('[data-hero-canvas]');return {x:+c.dataset.cx,y:+c.dataset.cy}})()")
    p0 = int(c.get_attribute("data-pulses") or -1)
    pg.mouse.click(box["x"], box["y"])
    check(int(c.get_attribute("data-pulses") or -1) == p0 + 1, "clicking the sphere sends a shockwave")
    sw = pg.locator("[data-autopilot]")
    check(sw.count() == 1 and sw.get_attribute("role") == "switch" and sw.get_attribute("aria-checked") == "false", "autopilot switch starts off")
    check(float(c.get_attribute("data-order")) < 0.05, "the visitor lands on the chaos")
    check(pg.locator("[data-ticker] li.done").count() == 0, "nothing is done before the visitor turns it on")
    pg.wait_for_selector("[data-ticker] li.failed", timeout=4000)
    check(pg.evaluate("getComputedStyle(document.querySelector('[data-ticker] li.failed .tick')).borderTopColor") == "rgb(240, 113, 103)", "the crosses are red")
    counts = []
    for _ in range(14):
        pg.wait_for_timeout(450); counts.append(pg.locator("[data-ticker] li.failed").count())
    check(len(set(counts)) >= 3 and max(counts) == 4, f"crosses appear one by one, in a loop {counts}")
    pg.wait_for_timeout(2200)
    backlog = pg.locator("[data-backlog]").inner_text()
    check(any(ch.isdigit() and ch != "0" for ch in backlog), f"tasks pile up while it is off ({backlog})")
    sw.click(); pg.wait_for_timeout(3200)
    check(sw.get_attribute("aria-checked") == "true", "autopilot switch turns on")
    check(float(c.get_attribute("data-order")) > 0.9, f"autopilot on assembles the sphere ({c.get_attribute('data-order')})")
    check(pg.locator("[data-backlog]").inner_text().startswith("0"), "autopilot on drains the backlog")
    check(pg.locator("[data-ticker] li.failed").count() == 0 and pg.locator("[data-ticker] li.done").count() >= 1, "autopilot on: crosses give way to checks")
    check(pg.evaluate("getComputedStyle(document.querySelector('[data-ticker] li.done .tick')).backgroundColor") == "rgb(74, 222, 128)", "the checks are green")
    sw.click(); pg.wait_for_timeout(2200)
    check(sw.get_attribute("aria-checked") == "false", "autopilot switch turns back off")
    check(float(c.get_attribute("data-order")) < 0.2, f"autopilot off scatters the sphere ({c.get_attribute('data-order')})")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW, reduced_motion="reduce")
    c = pg.locator("canvas[data-hero-canvas]")
    box = pg.evaluate("(()=>{const c=document.querySelector('[data-hero-canvas]');return {x:+c.dataset.cx,y:+c.dataset.cy}})()")
    rot0 = float(c.get_attribute("data-rot"))
    pg.mouse.move(box["x"], box["y"]); pg.mouse.down(); pg.mouse.move(box["x"] + 180, box["y"], steps=6); pg.mouse.up()
    check(abs(float(c.get_attribute("data-rot")) - rot0) > 0.2, "dragging spins the sphere, even with reduced motion")
    f0 = c.get_attribute("data-frames"); pg.wait_for_timeout(400)
    check(c.get_attribute("data-frames") == f0, "reduced motion: sphere has no running loop")
    check(float(c.get_attribute("data-order")) == 0, "reduced motion: starts on the chaos too")
    check(pg.locator("[data-ticker] li.failed").count() == 4, "reduced motion: crosses shown at once")
    pg.locator("[data-autopilot]").click()
    check(float(c.get_attribute("data-order")) == 1, "reduced motion: autopilot applies instantly")
    ctx.close()

    print("[machine]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    m = pg.locator("[data-machine]").first
    tabs = m.locator("[role=tab]")
    check(tabs.count() >= 4, f"machine offers scenarios ({tabs.count()})")
    first = m.locator("[data-step] h3").first.inner_text()
    tabs.first.focus(); pg.keyboard.press("ArrowRight")
    check(tabs.nth(1).get_attribute("aria-selected") == "true", "arrow key changes scenario")
    check(m.locator("[data-step] h3").first.inner_text() != first, "changing scenario changes the steps")
    n = m.locator("[data-step]").count()
    m.locator("[data-machine-run]").click()
    pg.wait_for_selector("[data-machine][data-state=done]", timeout=20000)
    check(m.locator("[data-step].is-done").count() == n, "run completes every step")
    check(m.locator("[data-machine-log] li").count() >= n, "run writes one log line per step")
    check(m.locator("[data-step] [aria-pressed]").count() == n, "each step can be cut")
    m.locator("[data-step] [aria-pressed]").nth(2).click()
    m.locator("[data-machine-run]").click()
    pg.wait_for_selector("[data-machine][data-state=broken]", timeout=20000)
    check(m.locator("[data-step].is-done").count() == 2, "a cut step stops the chain")
    check("sans cette étape" in m.locator("[data-machine-status]").inner_text().lower(), "a cut step explains the consequence")
    box1 = m.locator("[data-step]").first.bounding_box()
    h = m.locator("[data-step] [data-handle]").first.bounding_box()
    pg.mouse.move(h["x"] + 8, h["y"] + 8); pg.mouse.down(); pg.mouse.move(h["x"] + 68, h["y"] + 48, steps=5); pg.mouse.up()
    box2 = m.locator("[data-step]").first.bounding_box()
    check(abs(box2["x"] - box1["x"]) > 30, "nodes can be dragged")
    ctx.close()

    print("[machine : avant / après]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    m = pg.locator("[data-machine]").first
    mixI = m.locator("input[data-machine-mix]")
    tabs = m.locator("[role=tab]")
    n = m.locator("[data-step]").count()
    setmix = lambda v: pg.evaluate("v => {const i=document.querySelector('[data-machine] input[data-machine-mix]');i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}", v)
    check(mixI.input_value() in [str(x) for x in range(0, 20)] and m.locator("[data-step].is-after").count() == 0, "machine starts on the 'before'")
    check(m.locator(".m-chip").count() >= 3, "before shows the clutter")
    pitches = set()
    for i in range(tabs.count()):
        tabs.nth(i).click()
        away, toward = m.locator("[data-pitch-away]").inner_text(), m.locator("[data-pitch-toward]").inner_text()
        check(len(away) > 30 and len(toward) > 30 and away != toward, f"tab {i}: away-from and toward-goal sentences")
        pitches.add(away)
        before_t = m.locator("[data-machine-time]").inner_text()
        check(any(ch.isdigit() and ch != "0" for ch in before_t), f"tab {i}: manual time shown ({before_t})")
        mans = m.locator(".node-man").all_inner_texts()
        check(len(set(mans)) == m.locator("[data-step]").count(), f"tab {i}: every step describes its manual work")
        setmix(100)
        check(m.locator("[data-step].is-after").count() == m.locator("[data-step]").count(), f"tab {i}: slider brings order")
        check(m.locator("[data-machine-time]").inner_text().replace("\u00a0", " ") == "0 min", f"tab {i}: manual time drops to zero")
        seen = set()
        for j in range(m.locator("[data-step]").count()):
            btn = m.locator("[data-step] [aria-pressed]").nth(j)
            btn.click()
            txt = m.locator("[data-machine-status]").inner_text()
            check(txt.lower().startswith("sans cette étape") and len(txt) > 45, f"tab {i} step {j}: cutting states the consequence at once")
            seen.add(txt); btn.click()
        check(len(seen) == m.locator("[data-step]").count(), f"tab {i}: each consequence is specific")
    check(len(pitches) == tabs.count(), "each scenario has its own pitch")
    tabs.first.click()
    box = mixI.bounding_box()
    pg.mouse.move(box["x"] + 30, box["y"] + box["height"] / 2); pg.mouse.down()
    pg.mouse.move(box["x"] + box["width"] - 2, box["y"] + box["height"] / 2, steps=12); pg.mouse.up()
    check(int(mixI.input_value()) >= 95, f"the slider really drags ({mixI.input_value()})")
    m.locator("[data-step] [aria-pressed]").nth(2).click()
    m.locator("[data-machine-run]").click()
    pg.wait_for_selector("[data-machine][data-state=broken]", timeout=20000)
    check("argent n'arrive pas" in m.locator("[data-machine-status]").inner_text().replace("\u00a0", " "), "no reminder: the money does not arrive")
    check(m.locator("[data-step].is-skipped").count() == n - 3, "steps after the cut never happen")
    tabs.first.click(); m.locator("[data-machine-run]").click()
    pg.wait_for_selector("[data-machine][data-state=done]", timeout=20000)
    check(m.locator("[data-machine-mix]").input_value() == "100", "launching from 'before' glides to 'after'")
    check("argent" in m.locator("[data-machine-status]").inner_text().lower(), "success states the business result")
    ctx.close()

    print("[réalisations : mise en page]")
    ctx, pg, *_ = open_page(b, "/realisations/", viewport=VIEW)
    cols = pg.evaluate("getComputedStyle(document.querySelector('.cases')).gridTemplateColumns.split(' ').length")
    check(cols == 3, f"case studies laid out in 3 columns on their hub ({cols})")
    ctx.close()

    print("[scénario recrutement]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    check(pg.locator("[data-machine] [role=tab]", has_text="Recrutement").count() == 1, "recruitment scenario on the home machine")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/realisations/automatisation-agence-web/", viewport=VIEW)
    txt = main_text(pg).lower()
    check("service rh" in txt, "agency case tells the recruitment funnel")
    check("quatre ans" not in pg.content().lower(), "agency case does not state how long")
    check("nouveaux employés" in txt and "documents d'embauche" in txt.replace("\u2019", "'"), "agency case tells employee onboarding")
    check(not any(w in txt for w in ("notation", "noté", "scoring")), "no CV scoring on the agency case")
    check("amélioration continue" in txt, "the signature line closes the agency case")
    check(pg.locator("[data-machine] [role=tab]", has_text="Embauche").count() == 1, "agency case lets you play the hiring scenario")
    check(pg.locator("[data-machine] [role=tab][aria-selected=true]").inner_text() == "Recrutement", "agency case opens on recruitment")
    ctx.close()

    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    home = main_text(pg).lower()
    check("je construis la machine. et je reste pour l'amélioration continue." in home.replace("\u00a0", " "), "home carries the signature line")
    rec = pg.locator("[data-machine] [role=tab]", has_text="Recrutement")
    rec.click()
    steps = " ".join(pg.locator("[data-machine]").first.locator("[data-step]").all_inner_texts()).lower()
    check("noté" not in steps and "notation" not in steps, "no CV scoring in the recruitment scenario")
    ctx.close()

    print("[scénario avis]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    avis = pg.locator("[data-machine] [role=tab]", has_text="Avis Google")
    check(avis.count() == 1, "reviews scenario on the home machine")
    pg.locator("[data-niche-select]").select_option("restaurant")
    check(pg.locator("[data-machine] [role=tab][aria-selected=true]").inner_text() == "Avis Google", "restaurants open on the reviews scenario")
    ctx.close()

    print("[jeu]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    g = pg.locator("[data-game]")
    check(g.count() == 1, "game present")
    g.evaluate("e => e.dataset.duration = 2")
    g.locator("[data-game-start]").click()
    pg.wait_for_selector("[data-game-area] .task", timeout=4000)
    pg.locator("[data-game-area] .task").first.dispatch_event("click")
    check(g.locator("[data-game-score]").inner_text().strip() == "1", "clicking a task deletes it")
    pg.wait_for_selector("[data-game-area] .task", timeout=4000)
    pg.keyboard.press("Space")
    check(g.locator("[data-game-score]").inner_text().strip() == "2", "the space bar deletes the lowest task")
    pg.wait_for_selector("[data-game][data-state=over]", timeout=6000)
    check("2" in g.locator("[data-game-result]").inner_text(), "game over gives the score")
    check(g.locator("[data-game-result]").get_attribute("role") == "status", "game result is announced")
    check(pg.evaluate("localStorage.getItem('botfx-game-best')") == "2", "best score kept on the device")
    check(ctx.cookies() == [], "game sets no cookie")
    g.locator("[data-game-calm]").click()
    total = g.locator("[data-game-area] .task").count()
    check(total >= 8, f"calm mode shows the tasks ({total})")
    for _ in range(total):
        g.locator("[data-game-area] .task").first.click()
    check(g.get_attribute("data-state") == "over", "calm mode ends once every task is deleted")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW, reduced_motion="reduce")
    check(not pg.locator("[data-game-start]").is_visible(), "reduced motion: no timed game offered")
    check(pg.locator("[data-game-calm]").is_visible(), "reduced motion: calm game offered")
    ctx.close()

    print("[activité du visiteur]")
    from urllib.parse import unquote
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    sel = pg.locator("[data-niche-select]")
    check(sel.count() == 1 and sel.is_visible() and sel.bounding_box()["y"] < 900, "activity picker above the fold")
    check(pg.locator("[data-niche-select] option").count() >= 8, "at least 8 activities")
    base_day = pg.locator("[data-future-block]").all_inner_texts()
    check("administratif" in pg.locator("[data-niche-genius]").inner_text(), "generic line speaks to the pain")
    sel.select_option("artisan")
    check("Devis" in pg.locator("[data-ticker]").inner_text(), "cockpit speaks the chosen trade")
    day_txt = " ".join(pg.locator("[data-future-block] .fnow").all_inner_texts())
    check(pg.locator("[data-future-block]").all_inner_texts() != base_day and "devis" in day_txt.lower(), "the day is tailored")
    pg.evaluate("(()=>{const i=document.querySelector('[data-future] input');i.value=100;i.dispatchEvent(new Event('input',{bubbles:true}))})()")
    freed = " ".join(pg.locator("[data-future-block] .fthen b").all_inner_texts())
    check("chantier" in freed.lower(), f"freed time goes to the core of the trade ({freed[:50]})")
    check("chantiers" in pg.locator("[data-niche-genius]").inner_text(), "the line names their real job")
    check(any("Devis à finir" in x for x in pg.locator(".m-chip").all_inner_texts()), "the clutter comes from their trade")
    check("Artisan" in unquote(pg.locator("[data-calc-cta]").get_attribute("href") or ""), "the email states the activity")
    g = pg.locator("[data-game]")
    g.locator("[data-game-calm]").click()
    check(any("devis" in x.lower() for x in g.locator("[data-game-area] .task").all_inner_texts()), "the game uses their tasks")
    check(pg.evaluate("localStorage.getItem('botfx-niche')") == "artisan" and ctx.cookies() == [], "choice stays on the device, no cookie")
    pg.reload(wait_until="networkidle")
    check(pg.locator("[data-niche-select]").input_value() == "artisan" and "Devis" in pg.locator("[data-ticker]").inner_text(), "choice survives a reload")
    pg.locator("[data-niche-chips] [data-niche=formation]").click()
    check(pg.locator("[data-niche-select]").input_value() == "formation", "chips and select stay in sync")
    check(pg.locator("[data-machine] [role=tab][aria-selected=true]").inner_text() == "Inscription", "machine opens on the closest scenario")
    ctx.close()

    print("[la stratégie, c'est pour les agences]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    line = lambda: pg.locator("[data-niche-genius]").inner_text().lower()
    day = lambda: " ".join(pg.locator("[data-future-block]").all_inner_texts()).lower()
    check("stratégie" not in line() and "stratégie" not in day(), "generic visitor: no strategy talk")
    pg.locator("[data-niche-select]").select_option("agence")
    check("stratégie" in line(), "agency: the pain is strategy")
    for k in ("artisan", "commerce", "restaurant", "sante", "cabinet", "formation", "immobilier"):
        pg.locator("[data-niche-select]").select_option(k)
        check("stratégie" not in line() and "stratégie" not in day(), f"{k}: no strategy talk")
    ctx.close()

    print("[fond : seulement là où il illustre]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    bg = pg.locator("[data-bg-canvas]")
    check(bg.count() == 1 and bg.get_attribute("aria-hidden") == "true", "background field present and decorative")
    check(pg.evaluate("getComputedStyle(document.querySelector('[data-bg-canvas]')).pointerEvents") == "none", "background never blocks clicks")
    check(float(bg.get_attribute("data-alpha")) < 0.05, "hero stays clean")
    jump = lambda s: pg.evaluate("s => {const e=document.querySelector(s);scrollTo({top:e.getBoundingClientRect().top+scrollY+80,behavior:'instant'})}", s)
    for sel, shape in (("#services", "none"), ("#cercle", "orbit"), ("#machine", "network"), (".manifesto", "none"), ("#demain", "ordo"), ("#jeu", "none"), ("#calcul", "stars"), ("#realisations", "wave"), ("#methode", "stars"), ("#faq", "stars"), ("#contact", "sphere")):
        jump(sel); pg.wait_for_timeout(400)
        check(bg.get_attribute("data-formation") == shape, f"{sel} background = {shape} ({bg.get_attribute('data-formation')})")
        check((float(bg.get_attribute("data-alpha")) > 0.5) == (shape != "none"), f"{sel} background visible only if it illustrates")
    # la boule du contact naît de la division des points, et s'y refond
    jump("#faq"); pg.wait_for_timeout(3400)
    few = int(bg.get_attribute("data-visible"))
    jump("#contact"); pg.wait_for_timeout(3400)
    many = int(bg.get_attribute("data-visible"))
    check(many > few * 2, f"the sphere gathers far more points ({few} -> {many})")
    check(float(bg.get_attribute("data-sphere")) > 0.9, "the sphere is fully formed behind the contact")
    jump("#faq"); pg.wait_for_timeout(3600)
    check(int(bg.get_attribute("data-visible")) == few, f"points merge back, nothing is lost ({bg.get_attribute('data-visible')})")
    # rien ne se perd, tout se transforme : les points voyagent d'une forme à l'autre
    jump("#cercle"); pg.wait_for_timeout(3200)
    check(float(bg.get_attribute("data-morph")) == 1, "morph settles")
    start = [float(v) for v in bg.get_attribute("data-sample").split(",")]
    jump("#machine")
    samples, morphs = [start], []
    for _ in range(26):
        pg.wait_for_timeout(100)
        samples.append([float(v) for v in bg.get_attribute("data-sample").split(",")])
        morphs.append(float(bg.get_attribute("data-morph")))
    steps = [((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5 for a, b in zip(samples, samples[1:])]
    travel = sum(steps)
    check(travel > 60, f"points travel to the new shape ({travel:.0f}px)")
    check(max(steps) < travel * 0.45, f"no teleport: largest hop {max(steps):.0f}px of {travel:.0f}px")
    check(any(0 < v < 1 for v in morphs), "the rearrangement is visible over time")
    pg.wait_for_timeout(1500)
    check(float(bg.get_attribute("data-morph")) == 1, "the new shape is reached")
    setr = lambda sel, v: pg.evaluate("([s, v]) => {const i=document.querySelector(s);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}", [sel, v])
    jump("#machine"); pg.wait_for_timeout(300)
    setr("[data-machine] input[data-machine-mix]", 0); pg.wait_for_timeout(1200)
    check(float(bg.get_attribute("data-links")) < 0.1, f"before: no links between the dots ({bg.get_attribute('data-links')})")
    setr("[data-machine] input[data-machine-mix]", 100); pg.wait_for_timeout(1200)
    check(float(bg.get_attribute("data-links")) > 0.5, f"after: the network connects ({bg.get_attribute('data-links')})")
    f0 = int(bg.get_attribute("data-frames")); pg.wait_for_timeout(400)
    check(int(bg.get_attribute("data-frames")) > f0, "background is alive where it shows")
    jump("#demain"); pg.wait_for_timeout(300)
    setr("[data-future] input", 0); pg.wait_for_timeout(200)
    check(float(bg.get_attribute("data-drive")) == 0, "demain: chaos today")
    setr("[data-future] input", 100); pg.wait_for_timeout(200)
    check(float(bg.get_attribute("data-drive")) == 1, "demain: order in a year")
    pg.locator("[data-motion-toggle]").click(); pg.wait_for_timeout(100)
    f0 = bg.get_attribute("data-frames"); pg.wait_for_timeout(400)
    check(bg.get_attribute("data-frames") == f0, "pause button stops the background")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW, reduced_motion="reduce")
    bg = pg.locator("[data-bg-canvas]")
    pg.evaluate("(()=>{const e=document.querySelector('#machine');scrollTo({top:e.getBoundingClientRect().top+scrollY+80,behavior:'instant'})})()"); pg.wait_for_timeout(300)
    check(bg.get_attribute("data-formation") == "network" and float(bg.get_attribute("data-alpha")) > 0.5, "reduced motion: static background still follows sections")
    f0 = bg.get_attribute("data-frames"); pg.wait_for_timeout(400)
    check(bg.get_attribute("data-frames") == f0, "reduced motion: no animation loop")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/outils/", viewport=VIEW)
    check(pg.locator("[data-bg-canvas]").get_attribute("data-formation") == "wave", "tools page: the three lines")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/mentions-legales/", viewport=VIEW)
    check(float(pg.locator("[data-bg-canvas]").get_attribute("data-alpha")) < 0.05, "legal pages keep a plain background")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/realisations/", viewport=VIEW)
    pg.evaluate("(()=>{const h=[...document.querySelectorAll('h2')].find(e=>e.textContent.includes('en commun'));scrollTo({top:h.getBoundingClientRect().top+scrollY-250,behavior:'instant'})})()"); pg.wait_for_timeout(400)
    check(pg.locator("[data-bg-canvas]").get_attribute("data-formation") == "stars", "realisations: starry sky behind the shared principles")
    ctx.close()
    for path in ("/realisations/automatisation-agence-web/", "/services/automatisation-n8n/", "/services/"):
        ctx, pg, *_ = open_page(b, path, viewport=VIEW)
        pg.evaluate("(()=>{const h=document.querySelector('.prose-wide h2');scrollTo({top:h.getBoundingClientRect().top+scrollY-250,behavior:'instant'})})()"); pg.wait_for_timeout(400)
        check(pg.locator("[data-bg-canvas]").get_attribute("data-formation") == "stars", f"{path} starry sky behind the long text")
        ctx.close()
    print("[vrai hero sur chaque page]")
    for path in CONTENT:
        ctx, pg, *_ = open_page(b, path, viewport=VIEW)
        c = pg.locator("section.hero canvas[data-hero-canvas]")
        check(c.count() == 1, f"{path} has the real hero sphere")
        box = pg.locator("section.hero").bounding_box()
        check(box["height"] >= 900, f"{path} hero fills the screen ({box['height']:.0f})")
        check(float(c.get_attribute("data-order")) < 0.05, f"{path} starts on the chaos")
        if path == "/services/":
            pg.locator("[data-autopilot]").click(); pg.wait_for_timeout(3200)
            check(float(c.get_attribute("data-order")) > 0.9, "autopilot assembles the sphere on inner pages")
            p0 = int(c.get_attribute("data-pulses"))
            pg.mouse.click(float(c.get_attribute("data-cx")), float(c.get_attribute("data-cy")))
            check(int(c.get_attribute("data-pulses")) == p0 + 1, "the sphere reacts on inner pages")
        ctx.close()
    for w, h in ((1180, 820), (1280, 720), (1440, 900), (1920, 1080)):
        ctx = b.new_context(viewport={"width": w, "height": h}); pg = ctx.new_page()
        bad = []
        for path in CONTENT:
            pg.goto(BASE + path, wait_until="load"); pg.wait_for_timeout(200)
            hit = pg.evaluate("""()=>{const c=document.querySelector('.cockpit').getBoundingClientRect();
              return [...document.querySelectorAll('.hero h1 .w, .hero .lede, .hero .crumbs, .hero .btn')].some(e=>{const r=e.getBoundingClientRect();return r.right>c.left&&r.left<c.right&&r.bottom>c.top&&r.top<c.bottom})}""")
            if hit: bad.append(path)
        check(not bad, f"{w}x{h}: title never touches the cockpit {bad[:3]}")
        ctx.close()
    ctx, pg, *_ = open_page(b, "/services/automatisation-n8n/", viewport=VIEW)
    bg = pg.locator("[data-bg-canvas]")
    check(float(bg.get_attribute("data-alpha")) < 0.05, "the hero has its own sphere, no extra background")
    pg.evaluate("(()=>{const e=document.querySelector('[data-machine]').closest('section');scrollTo({top:e.getBoundingClientRect().top+scrollY+80,behavior:'instant'})})()"); pg.wait_for_timeout(300)
    check(bg.get_attribute("data-formation") == "none" and float(bg.get_attribute("data-alpha")) < 0.05, "inner-page machines stay on a plain background")
    ctx.close()

    print("[boule en bas de chaque page]")
    for path in ("/services/", "/services/automatisation-n8n/", "/realisations/automatisation-agence-web/", "/developpeur-web-dax-landes/"):
        ctx, pg, *_ = open_page(b, path, viewport=VIEW)
        bg = pg.locator("[data-bg-canvas]")
        pg.evaluate("(()=>{const e=document.querySelector('section.contact');scrollTo({top:e.getBoundingClientRect().top+scrollY+40,behavior:'instant'})})()")
        pg.wait_for_timeout(450)
        check(bg.get_attribute("data-formation") == "sphere", f"{path} closes on the sphere ({bg.get_attribute('data-formation')})")
        check(float(bg.get_attribute("data-morph")) < 1, f"{path} the points fly into the sphere")
        pg.wait_for_timeout(3000)
        check(float(bg.get_attribute("data-sphere")) > 0.9 and int(bg.get_attribute("data-visible")) > 300, f"{path} sphere fully formed")
        ctx.close()

    print("[cockpit sur chaque page : page x secteur]")
    from urllib.parse import unquote as _unq
    ctx = b.new_context(viewport=VIEW)
    pg = ctx.new_page(); pg.goto(BASE + "/", wait_until="networkidle")
    pg.locator("[data-niche-select]").select_option("restaurant")
    for path, word in (("/services/ia-agents-entreprise/", "Allergènes"), ("/services/creation-site-sur-mesure/", "Carte en ligne"), ("/services/wordpress-plugins-maintenance/", "Réservation testée"), ("/services/web-app-pwa-saas/", "Planning consulté"), ("/services/automatisation-n8n/", "Facture fournisseur")):
        pg.goto(BASE + path, wait_until="networkidle")
        check(pg.locator(".cockpit [data-autopilot]").count() == 1, f"{path} has the cockpit")
        check(pg.locator("[data-niche-select]").input_value() == "restaurant", f"{path} remembers the activity")
        check(word in pg.locator("[data-ticker]").inner_text(), f"{path} tasks match page and activity ({word})")
        mail = _unq(pg.locator("main a[href^='mailto:contact@botfx.fr']").first.get_attribute("href") or "")
        check("Restauration" in mail, f"{path} email states the activity")
    for path in ("/services/", "/realisations/", "/realisations/automatisation-agence-web/", "/developpeur-web-dax-landes/"):
        pg.goto(BASE + path, wait_until="networkidle")
        check(pg.locator(".cockpit [data-ticker] li").count() == 4, f"{path} has the cockpit too")
    pg.goto(BASE + "/services/ia-agents-entreprise/", wait_until="networkidle")
    pg.locator("[data-niche-select]").select_option("immobilier")
    check("Annonce rédigée" in pg.locator("[data-ticker]").inner_text(), "changing activity updates this page")
    sw = pg.locator("[data-autopilot]")
    check(sw.get_attribute("aria-checked") == "false", "inner page: autopilot starts off")
    pg.wait_for_selector("[data-ticker] li.failed", timeout=4000)
    sw.click(); pg.wait_for_timeout(1400)
    check(sw.get_attribute("aria-checked") == "true" and pg.locator("[data-ticker] li.done").count() >= 1 and pg.locator("[data-ticker] li.failed").count() == 0, "inner page: the autopilot works")
    pg.goto(BASE + "/", wait_until="networkidle")
    check(pg.locator("[data-niche-select]").input_value() == "immobilier", "and the home follows")
    check(ctx.cookies() == [], "still no cookie")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/services/ia-agents-entreprise/", viewport=VIEW)
    check(pg.locator("[data-niche-select]").input_value() == "" and "Source citée" in pg.locator("[data-ticker]").inner_text(), "no activity chosen: tasks of the page only")
    ctx.close()

    print("[/bni : carte de visite]")
    import urllib.request as _ur
    _get = lambda u: _ur.urlopen(_ur.Request(BASE + u, headers=UA))
    html_bni = _get("/bni/").read().decode()
    check('content="noindex"' in html_bni, "/bni is not indexed")
    ctx = b.new_context(viewport=VIEW, accept_downloads=True); pg = ctx.new_page()
    got = []
    pg.on("download", lambda d: got.append(d.suggested_filename))
    pg.goto(BASE + "/bni/", wait_until="load"); pg.wait_for_timeout(6000)
    check(got and got[0].endswith(".vcf"), f"/bni hands over the contact card by itself {got}")
    check(pg.url.rstrip("/") == BASE.rstrip("/"), f"/bni then returns to the home page ({pg.url})")
    ctx.close()
    check('href="/bni/francois-dasylva.vcf"' in html_bni, "/bni keeps a manual button")
    r = _get("/bni/francois-dasylva.vcf")
    check("vcard" in r.headers.get("Content-Type", "").lower(), f"vcard content type ({r.headers.get('Content-Type')})")
    v = r.read().decode()
    import base64 as _b64
    carte = v.replace("\r\n ", "")
    photo = [l for l in carte.split("\r\n") if l.startswith("PHOTO;")]
    check(len(photo) == 1 and photo[0].startswith("PHOTO;ENCODING=b;TYPE=JPEG:"), "the contact card carries a JPEG photo")
    octets = _b64.b64decode(photo[0].split(":", 1)[1]) if photo else b""
    check(octets[:2] == b"\xff\xd8" and 15_000 < len(octets) < 150_000, f"the photo is a real, light picture ({len(octets)} bytes)")
    for needle in ("BEGIN:VCARD", "VERSION:3.0", "FN:François Dasylva", "ORG:BotFx", "TEL;TYPE=CELL,VOICE:+33607213614", "EMAIL;TYPE=WORK,INTERNET:francois@botfx.fr", "URL:https://botfx.fr", "linkedin.com/in/francois-dasylva", "PHOTO;ENCODING=b;TYPE=JPEG:", "END:VCARD"):
        check(needle in v, f"vcard has {needle[:30]}")
    check("\r\n" in v and all(len(l.encode()) <= 75 for l in v.split("\r\n")), "vcard lines folded at 75 bytes (CRLF)")
    check("/bni" not in _get("/sitemap.xml").read().decode(), "/bni stays out of the sitemap")

    print("[le texte des pages suit le métier]")
    import re as _re
    PROMESSES = _re.compile(r"télétransmission|feuilles de soins|diagnostics DPE|suivent sans erreur|libèrent[^.]*\bet de (?:vos|la) |cités? par les IA|citées par les IA|réponses des IA|réponses IA|trouvée?s? (?:par|sur) Google|bien référencés")
    NICHE_KEYS = ["artisan", "commerce", "restaurant", "sante", "cabinet", "agence", "formation", "immobilier"]
    for path in ("/", "/services/", "/services/automatisation-n8n/", "/services/creation-site-sur-mesure/", "/services/web-app-pwa-saas/", "/services/wordpress-plugins-maintenance/", "/services/ia-agents-entreprise/", "/realisations/", "/realisations/automatisation-cabinet-de-paie/", "/realisations/application-pwa-infirmiers-liberaux/", "/realisations/automatisation-agence-web/", "/developpeur-web-dax-landes/"):
        ctx, pg, *_ = open_page(b, path, viewport=VIEW)
        total = int(pg.evaluate("document.documentElement.dataset.personalTargets || -1"))
        missing = pg.evaluate("document.documentElement.dataset.personalMissing || ''")
        check(total >= 2 and not missing, f"{path} every personalised text is found ({total}) {missing}")
        base = main_text(pg)
        check(not PROMESSES.findall(base.replace("\u00a0", " ")), f"{path}: base text makes no unprovable promise {PROMESSES.findall(base.replace(chr(160), ' '))[:2]}")
        seen = set()
        for k in NICHE_KEYS:
            pg.locator("[data-niche-select]").select_option(k)
            txt = main_text(pg); seen.add(txt)
            check("{" not in txt and "undefined" not in txt and txt != base, f"{path} {k}: text rewritten, no hole")
            bad = _re.findall(r"\S {1,2}[:;!?»]", txt)
            check(not bad, f"{path} {k}: French spacing {bad[:2]}")
            fautes = _re.findall(r"\b(?:de|à) les (?:devis|stocks|factures|pièces|validations|émargements|annonces)\b", txt)
            check(not fautes, f"{path} {k}: French contractions {fautes[:2]}")
            risque = PROMESSES.findall(txt.replace("\u00a0", " "))
            check(not risque, f"{path} {k}: no promise on regulated work {risque[:2]}")
        check(len(seen) == len(NICHE_KEYS), f"{path} each trade reads differently")
        pg.locator("[data-niche-select]").select_option("")
        check(main_text(pg) == base, f"{path} no activity: original text restored")
        ctx.close()
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    pg.locator("[data-niche-select]").select_option("sante")
    lead = pg.locator(".hero .lede").inner_text()
    check("paperasse" in lead and "soigner" in lead, f"home speaks to carers ({lead[:60]})")
    check("patients" in pg.locator("#services").inner_text(), "service cards speak of patients")
    for k, word in (("artisan", "MaPrimeRénov"), ("restaurant", "HACCP"), ("formation", "Qualiopi"), ("immobilier", "DPE"), ("cabinet", "facture électronique"), ("sante", "rappels aux patients"), ("commerce", "remboursements"), ("agence", "retours client")):
        pg.locator("[data-niche-select]").select_option(k)
        check(word in pg.locator(".hero .lede").inner_text(), f"{k}: the very first sentence uses the jargon ({word})")
    pg.reload(wait_until="networkidle")
    check("retours client" in pg.locator(".hero .lede").inner_text(), "the rewrite applies by itself on the next visit")
    ctx.close()

    print("[santé : pas de données patients dans l'IA]")
    for path, sels in (("/services/ia-agents-entreprise/", ["main"]), ("/", ["#services .offers article:nth-child(5)", "[data-circle-step]:nth-child(5)"]), ("/services/", [".offers article:nth-child(2)"])):
        ctx, pg, *_ = open_page(b, path, viewport=VIEW)
        pg.locator("[data-niche-select]").select_option("sante")
        for sel in sels:
            txt = pg.locator(sel).first.evaluate("e => e.textContent")
            check("patient" not in txt.lower(), f"{path} {sel}: health mode keeps patients away from AI")
        ctx.close()

    print("[cercle sur téléphone]")
    for w, h in ((360, 520), (360, 640), (360, 657), (390, 664), (412, 732), (320, 568), (800, 600), (1024, 640), (1280, 600), (1366, 625), (1366, 657)):
        mob = w < 700
        ctx, pg, *_ = open_page(b, "/", viewport={"width": w, "height": h}, has_touch=mob, is_mobile=mob)
        pg.locator("[data-niche-select]").select_option("artisan")
        C = pg.locator("[data-circle]")
        goto = lambda f: (pg.evaluate("f => {const s=document.querySelector('[data-circle]');scrollTo({top:s.offsetTop+(s.offsetHeight-innerHeight)*f,behavior:'instant'})}", f), pg.wait_for_timeout(700))
        check(pg.evaluate("getComputedStyle(document.querySelector('[data-circle] .circle-stick')).position") == "sticky", f"{w}x{h}: circle pinned on phone")
        goto(0); a0 = float(C.get_attribute("data-angle"))
        goto(.5); a1 = float(C.get_attribute("data-angle"))
        check(abs(a1 - a0) > 0.5, f"{w}x{h}: circle turns with the scroll ({a0} -> {a1})")
        for f in (0, .2, .4, .6, .8, 1):
            goto(f)
            top, bottom, inner, stage = pg.evaluate("(()=>{const c=document.querySelector('.circle-copy').getBoundingClientRect(),g=document.querySelector('.circle-stage canvas').getBoundingClientRect();return [g.top,c.bottom,innerHeight,g.bottom<=c.top+1]})()")
            check(top >= 50 and bottom <= inner + 1 and (stage or not mob), f"{w}x{h}: ring and text fit at {f} ({top:.0f}-{bottom:.0f}/{inner})")
            check(C.get_attribute("data-clipped") == "0", f"{w}x{h}: labels not cropped at {f}")
        goto(1)
        check(pg.evaluate("[...document.querySelectorAll('[data-circle-step]')].findIndex(e => e.classList.contains('is-active'))") == 5, f"{w}x{h}: ends on the last step")
        ctx.close()

    print("[jeu : zone entière à l'écran]")
    for w, h, mob in ((360, 657, True), (412, 780, True), (768, 960, True), (1280, 600, False), (1366, 625, False), (1440, 780, False)):
        ctx, pg, *_ = open_page(b, "/", viewport={"width": w, "height": h}, is_mobile=mob, has_touch=mob)
        pg.locator("[data-game]").evaluate("e => e.dataset.duration = 4")
        pg.locator("[data-game-start]").click(); pg.wait_for_timeout(1600)
        top, bottom, hud = pg.evaluate("(()=>{const a=document.querySelector('[data-game-area]').getBoundingClientRect(),h=document.querySelector('.game-hud').getBoundingClientRect();return [a.top,a.bottom,h.top]})()")
        check(hud >= 60 and bottom <= h + 1, f"{w}x{h}: score and whole falling zone on screen ({hud:.0f}, {top:.0f}-{bottom:.0f}/{h})")
        ctx.close()

    print("[calculateur]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    digits = lambda t: "".join(ch for ch in t if ch.isdigit())
    check(digits(pg.locator("[data-calc-hours]").inner_text()) == "338", f"default hours = 6×2×47×60 % ({pg.locator('[data-calc-hours]').inner_text()})")
    check(digits(pg.locator("[data-calc-euros]").inner_text()) == "11844", f"default euros ({pg.locator('[data-calc-euros]').inner_text()})")
    pg.evaluate("(()=>{const i=document.querySelector('[data-calc=hours]');i.value=10;i.dispatchEvent(new Event('input',{bubbles:true}))})()")
    check(digits(pg.locator("[data-calc-hours]").inner_text()) == "564", "moving a slider updates the result")
    check("564" in (pg.locator("[data-calc-cta]").get_attribute("href") or ""), "the email carries the estimate")
    check("47 semaines" in pg.locator("[data-calc-formula]").inner_text(), "the formula is shown")
    check(pg.locator("[data-calc-grid] .is-on").count() > 0, "days grid lights up")
    check("promesse" in pg.locator("[data-calc]").first.evaluate("e => e.closest('section').innerText").lower(), "estimate is not sold as a promise")
    ctx.close()

    print("[cercle vertueux]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    C = pg.locator("[data-circle]")
    steps = C.locator("[data-circle-step]")
    n = steps.count()
    check(n >= 5, f"circle has steps ({n})")
    goto = lambda f: pg.evaluate("f => {const s=document.querySelector('[data-circle]');scrollTo({top:s.offsetTop+(s.offsetHeight-innerHeight)*f,behavior:'instant'})}", f)
    active = lambda: pg.evaluate("[...document.querySelectorAll('[data-circle-step]')].findIndex(e => e.classList.contains('is-active'))")
    goto(0); pg.wait_for_timeout(700)
    a0 = float(C.get_attribute("data-angle")); check(active() == 0, "circle starts on step 1")
    goto(0.5); pg.wait_for_timeout(900)
    a1 = float(C.get_attribute("data-angle")); mid = active()
    check(abs(a1 - a0) > 0.5, f"circle turns with the scroll ({a0} -> {a1})")
    check(0 < mid < n - 1, f"scrolling highlights a middle step ({mid})")
    bg_rot = float(pg.locator("[data-bg-canvas]").get_attribute("data-orbit-rot"))
    check(abs(bg_rot - a1) < 0.1, f"background rings turn with the wheel ({bg_rot} vs {a1})")
    check(pg.evaluate("getComputedStyle(document.querySelector('[data-circle] .circle-stick')).position") == "sticky", "circle is pinned")
    goto(1); pg.wait_for_timeout(900)
    check(active() == n - 1, "circle ends on the last step")
    for f in (0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1):
        goto(f); pg.wait_for_timeout(500)
        check(C.get_attribute("data-clipped") == "0", f"circle labels never cropped at {f}")
    steps.nth(1).locator("button").click(); pg.wait_for_timeout(1600)
    check(active() == 1, f"clicking a step turns the circle to it ({active()})")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW, reduced_motion="reduce")
    check(pg.evaluate("getComputedStyle(document.querySelector('[data-circle] .circle-stick')).position") != "sticky", "reduced motion: circle not pinned")
    hidden_steps = pg.evaluate("[...document.querySelectorAll('[data-circle-step] p')].filter(e => e.offsetHeight === 0).length")
    check(hidden_steps == 0, "reduced motion: every step readable")
    ctx.close()

    print("[votre boîte demain]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    F = pg.locator("[data-future]")
    setf = lambda v: pg.evaluate("v => {const i=document.querySelector('[data-future] input');i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}", v)
    setf(0); check(F.locator(".is-auto").count() == 0, "today: nothing automated")
    setf(100); total = F.locator("[data-future-block]").count()
    check(total >= 6 and F.locator(".is-auto").count() == total, "tomorrow: everything repetitive is automated")
    check(digits(F.locator("[data-future-hours]").inner_text()) != "0", "tomorrow: hours given back")
    check("exemple" in F.inner_text().lower(), "future day is labelled as an example")
    ctx.close()

    print("[existant conservé]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    check("pilote automatique" in pg.locator("h1").inner_text(), "tagline stays the H1")
    for sel in ("#services", "#methode", "#contact", ".manifesto", ".marquee"):
        check(pg.locator(sel).count() == 1, f"existing block kept: {sel}")
    ctx.close()

    print("[radiographie]")
    ctx, pg, *_ = open_page(b, "/services/creation-site-sur-mesure/", viewport=VIEW)
    pg.wait_for_function("document.querySelector('[data-xray-weight]').textContent.trim() !== '…'")
    check(any(ch.isdigit() and ch != "0" for ch in pg.locator("[data-xray-weight]").inner_text()), "page weight measured live")
    check(pg.locator("[data-xray-third]").inner_text().strip() == "0", "third-party count measured live")
    check(pg.locator("[data-xray-cookies]").inner_text().strip() == "0", "cookie count measured live")
    pg.locator("[data-xray-toggle]").click()
    check(pg.evaluate("document.documentElement.classList.contains('xray')"), "x-ray mode switches on")
    ctx.close()

    print("[téléphone]")
    ctx, pg, *_ = open_page(b, "/services/web-app-pwa-saas/", viewport=VIEW)
    ph = pg.locator("[data-phone]")
    check(ph.count() == 1, "phone demo present")
    ph.locator("[data-phone-offline]").click()
    check(ph.get_attribute("data-offline") == "true", "airplane mode toggles")
    for _ in range(3):
        ph.locator("[data-phone-screen] [data-choice]").first.click()
    check("appareil" in ph.locator("[data-phone-screen]").inner_text().lower(), "flow finishes offline, computed on the device")
    ctx.close()

    print("[faq + maillage]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    faq = pg.locator("details.faq")
    check(faq.count() >= 5, f"home FAQ ({faq.count()})")
    faq_all = pg.locator("#faq").text_content()  # les réponses fermées ne sont pas dans inner_text
    check("prise d'otage" in faq_all, "leaving is not a hostage situation")
    check("tout est déjà documenté" in faq_all, "documenting processes makes hiring easier")
    check("est une option" in faq_all and "seule solution qui s'impose" in faq_all, "French hosting is an option, not a promise")
    faq.nth(1).locator("summary").click()
    check(faq.nth(1).evaluate("e => e.open"), "FAQ opens")
    hrefs = pg.locator("[data-offer] a").evaluate_all("as => as.map(a => a.getAttribute('href'))")
    check(sorted(hrefs) == sorted(SERVICES), f"offers link to the 5 service pages {hrefs}")
    check(pg.locator("[data-case] a").count() == 3, "home links the three case studies")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/", viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    btn = pg.locator("[data-menu-toggle]")
    check(btn.is_visible() and btn.get_attribute("aria-expanded") == "false", "mobile menu closed by default")
    btn.click()
    check(btn.get_attribute("aria-expanded") == "true" and pg.locator(".nav a[href='/services/']").is_visible(), "mobile menu opens")
    pg.keyboard.press("Escape")
    check(btn.get_attribute("aria-expanded") == "false", "Escape closes the mobile menu")
    ctx.close()

    # --- Contenu : pages étoffées, uniques, structurées, sans donnée client
    print("[contenu]")
    import json as _json, re as _re, urllib.request as _u
    titles, descs, links = {}, {}, set()
    # La liste des noms interdits vit dans ops/ (gitignoré) : le dépôt est public.
    _names = Path(__file__).resolve().parents[1] / "ops" / "noms-clients.txt"
    NAMES = _re.compile(_names.read_text().strip(), _re.I) if _names.exists() else None
    check(NAMES is not None or BASE.startswith("https://"), "client-name list available locally")
    for path in PAGES:
        ctx, pg, *_ = open_page(b, path, viewport=VIEW)
        pg.wait_for_timeout(250)
        titles[path] = pg.title()
        descs[path] = pg.locator("meta[name=description]").get_attribute("content")
        if NAMES: check(not NAMES.search(pg.content()), f"{path} names no client (public repo rule)")
        check(not _re.search(r"<[^>]+\son[a-z]+=", pg.content()), f"{path} no inline event handler (blocked by the production CSP)")
        txt = main_text(pg)
        bad = _re.findall(r"\S {1,2}[:;!?»]|« \S", txt)
        check(not bad, f"{path} French spacing uses non-breaking spaces {bad[:3]}")
        links |= set(pg.locator("a[href^='/']").evaluate_all("as => as.map(a => a.getAttribute('href').split('#')[0])"))
        if path in CONTENT:
            words = len(txt.split())
            check(words >= 300, f"{path} has real content ({words} words)")
            kinds = []
            for raw in pg.locator("script[type='application/ld+json']").all_inner_texts():
                d = _json.loads(raw); kinds.append(d.get("@type"))
            check("BreadcrumbList" in kinds, f"{path} breadcrumb JSON-LD {kinds}")
            check(pg.locator("nav.crumbs a").count() >= 1, f"{path} visible breadcrumb")
        if path in SERVICES:
            check("Service" in kinds and "FAQPage" in kinds, f"{path} Service + FAQPage JSON-LD {kinds}")
            check(pg.locator("[data-play], [data-machine], [data-xray], [data-phone]").count() >= 1, f"{path} has something to play with")
        ctx.close()
    check(len(set(titles.values())) == len(PAGES), "titles are unique")
    check(len(set(descs.values())) == len(PAGES), "descriptions are unique")
    for href in sorted(links):
        try:
            code = _u.urlopen(_u.Request(BASE + href, headers=UA)).status
        except Exception as e:
            code = getattr(e, "code", 0)
        check(code == 200, f"internal link {href} ({code})")
    sm = _u.urlopen(_u.Request(BASE + "/sitemap.xml", headers=UA)).read().decode()
    for path in PAGES:
        check(f"<loc>https://botfx.fr{path}</loc>" in sm, f"sitemap lists {path}")
    check("<lastmod>" in sm, "sitemap has lastmod")
    llms = _u.urlopen(_u.Request(BASE + "/llms.txt", headers=UA)).read().decode()
    check(all(("https://botfx.fr" + p) in llms for p in CONTENT), "llms.txt lists the content pages")

    ctx, pg, *_ = open_page(b, "/developpeur-web-dax-landes/", viewport=VIEW)
    txt = main_text(pg).lower()
    check(not any(w in txt for w in ("sur place", "vous déplacez", "je me déplace ", "à côté de chez vous")), "no promise of on-site meetings")
    ctx.close()

    print("[petits formats]")
    ctx, pg, *_ = open_page(b, "/", viewport={"width": 320, "height": 640}, is_mobile=True, has_touch=True)
    right = pg.evaluate("document.querySelector('.eyebrow').getBoundingClientRect().right")
    check(right <= 320, f"hero badge fits a 320 px phone ({right:.0f})")
    ctx.close()
    ctx, pg, *_ = open_page(b, "/", viewport={"width": 1280, "height": 720})
    for f in (0, .5, 1):
        pg.evaluate("f => {const s=document.querySelector('[data-circle]');scrollTo({top:s.offsetTop+(s.offsetHeight-innerHeight)*f,behavior:'instant'})}", f); pg.wait_for_timeout(700)
        top, bottom = pg.evaluate("(()=>{const c=document.querySelector('.circle-copy').getBoundingClientRect();return [c.top,c.bottom]})()")
        check(top >= 68 and bottom <= 720, f"circle text fits 1280x720 at {f} ({top:.0f}-{bottom:.0f})")
    ctx.close()

    print("[mobile : toutes les pages]")
    for path in PAGES:
        ctx, pg, *_ = open_page(b, path, viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        sw = pg.evaluate("document.documentElement.scrollWidth")
        check(sw <= 390, f"{path} no horizontal scroll ({sw})")
        small = pg.evaluate("""[...document.querySelectorAll('main button, main [role=tab], main input[type=range]')]
            .filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).map(e => e.className || e.tagName).slice(0, 4)""")
        check(not small, f"{path} controls at least 44 px tall {small}")
        ctx.close()

    print("[a11y axe : plein mouvement, jouets actifs]")
    for path in ("/", "/services/automatisation-n8n/", "/services/web-app-pwa-saas/", "/services/creation-site-sur-mesure/"):
        ctx, pg, *_ = open_page(b, path, viewport=VIEW, bypass_csp=True)
        pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(1500)
        pg.add_script_tag(path=AXE)
        res = pg.evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}})")
        v = [(x["id"], len(x["nodes"]), x["nodes"][0]["target"]) for x in res["violations"]]
        check(not v, f"{path} axe full motion: 0 violation {v}")
        ctx.close()

    print("[pause : les jouets s'arrêtent]")
    ctx, pg, *_ = open_page(b, "/", viewport=VIEW)
    pg.locator("[data-motion-toggle]").click()
    c = pg.locator("canvas[data-hero-canvas]")
    f0 = c.get_attribute("data-frames"); pg.wait_for_timeout(400)
    check(c.get_attribute("data-frames") == f0, "pause button stops the sphere")
    ctx.close()

    b.close()

# HSTS must not cover subdomains: webmail/* point to OVH, which has no botfx certificate
from pathlib import Path
hdr = (Path(__file__).resolve().parents[1] / "dist" / "_headers").read_text()
check("Strict-Transport-Security" in hdr, "HSTS header present")
check("includeSubDomains" not in hdr, "HSTS does not lock subdomains (webmail on OVH)")

print(f"\n{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
