# BOTFX DESIGN SYSTEM — Document de référence

> Document de référence exhaustif pour générer du contenu brandé **botfx** (François Dasylva, EI).
> Couvre : génération PDF (WeasyPrint), site web, visuels sociaux, vidéo (Remotion), design tokens complets.
> **Objectif** : tout est ici. Le kit PDF décrit est **fonctionnel et testé** (`brand/pdf/`).

---

## 1. STACK TECHNIQUE

### PDF : Python 3 + WeasyPrint + Jinja2

```bash
pip install weasyprint jinja2 pypdf   # pypdf + poppler (pdffonts, pdftoppm) pour les tests
```

```bash
# Générer un rapport depuis un JSON de données
python3 brand/pdf/generate_report.py donnees.json sortie.pdf               # thème clair (défaut)
python3 brand/pdf/generate_report.py donnees.json sortie.pdf --theme dark  # pages intérieures noires
python3 brand/pdf/tests/test_pdf_kit.py                                    # test de comportement du kit
```

**Paramètres critiques WeasyPrint :**
```python
HTML(string=html, base_url=str(ASSETS_DIR)).write_pdf(str(output))
```
- `base_url=ASSETS_DIR` — résout `style.css`, `fonts/*.ttf` (relatifs).
- **Pas de `full_fonts=True`** : le subsetting (défaut) garde le PDF à ~70 Ko (vs ~60 Mo chez Gogency).
- Polices en **TTF** (pas de woff2 côté PDF).

### Web : HTML / CSS / JS vanilla (site botfx.fr)
Zéro framework, zéro dépendance. Voir `botfx-site/` (`build.py`, `assets/css/site.css`, `assets/js/site.js`).

### Vidéo (futur) : Remotion — tokens TS/Tailwind en §8.

---

## 2. ARBORESCENCE

```
botfx-site/
├── assets/                       # SITE web (polices woff2, css, js, favicon, og.png)
├── brand/
│   ├── BOTFX_DESIGN_SYSTEM.md    # CE FICHIER
│   ├── linkedin-banner.png       # 3168×792 (1584×396 @2x)
│   └── pdf/                      # KIT PDF
│       ├── brand.py              # tokens Python + score_to_grade() + sphere_svg()
│       ├── generate_report.py    # CLI : JSON → PDF (--theme light|dark, --template)
│       ├── assets/
│       │   ├── style.css         # framework PDF complet (@page, composants)
│       │   ├── logo.svg          # logo blanc (fond noir) — usage hors PDF*
│       │   ├── logo-ink.svg      # logo noir (fond clair) — usage hors PDF*
│       │   └── fonts/            # Geist 400/500/600/700 + Geist Mono 400/500 (TTF)
│       ├── templates/
│       │   ├── base.html         # squelette (thème via data-theme)
│       │   ├── macros.html       # composants : cover, toc, kpis, action, score_bar, back…
│       │   └── rapport_seo.html  # rapport d'actions SEO (cover → sommaire → 4 sections → 4e)
│       ├── examples/rapport_seo.json   # données FICTIVES de démo = schéma de référence
│       ├── tests/test_pdf_kit.py       # test comportement (pages, polices, footer, barres…)
│       └── output/                     # PDF générés
└── tools/                        # og.html, linkedin-banner.html (gabarits de visuels)
```
\* Dans les PDF, le logo est écrit en **HTML** (point + « botfx » en Geist) : un SVG contenant du texte ferait retomber WeasyPrint sur une police de secours.

---

## 3. DESIGN TOKENS

### 3a. Palette — noir / argent / blanc

**Univers sombre (site, couvertures, réseaux sociaux)**

| Nom | Hex | Usage |
|---|---|---|
| black | `#050506` | Fond principal (jamais `#000`) |
| black-2 | `#0B0B0D` | Fond secondaire, blocs code |
| black-card | `#111114` | Cartes |
| line | `rgba(255,255,255,.08)` / `.16` | Bordures, séparateurs |
| fg | `#F5F5F6` | Texte principal |
| muted | `#A3A7AE` | Texte secondaire (contraste 8,3:1 sur black) |
| dim | `#878B93` | Labels, méta (≥ 5,3:1 — conforme AA petit texte) |
| silver | dégradé `#FFFFFF → #D9DCE1 (38%) → #8B9098 (72%) → #C9CCD1` | Mots clés des titres, e-mail géant |
| sheen | `linear-gradient(110deg, transparent 30%, rgba(255,255,255,.85) 50%, transparent 70%)` | Reflet animé sur l'argent |

**Pages intérieures claires (PDF)**

| Nom | Hex | Usage |
|---|---|---|
| paper | `#FFFFFF` | Fond page |
| paper-2 | `#F6F6F7` | Encadrés, pistes de barres |
| rule | `#E4E4E7` | Bordures, lignes de tableau |
| ink | `#0A0A0B` | Texte principal, titres, barres « après » |
| ink-2 | `#3F3F46` | Corps de texte |
| ink-3 | `#71717A` | Labels, footers (4,8:1 sur blanc) |

**Statuts (sobres, jamais décoratifs)**

| Rôle | Clair | Sombre |
|---|---|---|
| positive | `#1F9D63` | `#4ADE80` |
| warning | `#B7791F` | `#E8C468` |
| negative | `#C8413A` | `#F07167` |

**Grades (scores /100)** — A ≥ 90 `#1F9D63` · B ≥ 75 `#5E9E4A` · C ≥ 60 `#B7951F` · D ≥ 40 `#C9772B` · E ≥ 20 `#C8413A` · F `#962020`

> Règle : la couleur ne porte jamais seule l'information (toujours un chiffre ou un libellé à côté).

#### CSS
```css
:root{
  --black:#050506; --black-2:#0B0B0D; --black-card:#111114;
  --fg:#F5F5F6; --muted:#A3A7AE; --dim:#878B93;
  --line:rgba(255,255,255,.08); --line-2:rgba(255,255,255,.16);
  --silver:linear-gradient(180deg,#ffffff 0%,#d9dce1 38%,#8b9098 72%,#c9ccd1 100%);
  --paper:#FFFFFF; --paper-2:#F6F6F7; --rule:#E4E4E7; --ink:#0A0A0B; --ink-2:#3F3F46; --ink-3:#71717A;
  --positive:#1F9D63; --warning:#B7791F; --negative:#C8413A;
  --ease:cubic-bezier(.22,1,.36,1);
}
```

#### TypeScript (Remotion)
```ts
export const COLORS = {
  black: "#050506", black2: "#0B0B0D", blackCard: "#111114",
  fg: "#F5F5F6", muted: "#A3A7AE", dim: "#878B93",
  silver: ["#FFFFFF", "#D9DCE1", "#8B9098", "#C9CCD1"],
  paper: "#FFFFFF", paper2: "#F6F6F7", rule: "#E4E4E7", ink: "#0A0A0B", ink2: "#3F3F46", ink3: "#71717A",
  positive: "#1F9D63", warning: "#B7791F", negative: "#C8413A",
} as const;
export const EASE = [0.22, 1, 0.36, 1] as const;
```

#### Python
Source de vérité : `brand/pdf/brand.py` → `BOTFX`, `GRADE_COLORS`, `score_to_grade()`.

### 3b. Logo & signature visuelle

- **Logo** : un **point blanc lumineux** (halo) + le mot **botfx** en Geist SemiBold, minuscules, interlettrage −0,02 em.
  - Sur fond sombre : point `#FFF` + `box-shadow: 0 0 14px #fff`, texte `#F5F5F6`.
  - Sur fond clair : point et texte `#0A0A0B`, sans halo.
  - Favicon : carré noir arrondi, point blanc + halo (`assets/favicon.svg`).
- **Signature** : la **sphère de points argentés** (répartition de Fibonacci, ~1 000–1 700 points, perspective, opacité selon la profondeur) avec **un anneau orbital** et **un satellite lumineux**.
  - Web : canvas animé (`site.js`). PDF/visuels : SVG statique via `brand.sphere_svg(size, n, rot_y, rot_x, ring)`.
  - Toujours sur fond noir, jamais recolorée.
- **Description (alt / génération IA)** : « Un point blanc lumineux suivi du mot botfx en minuscules ; une sphère faite de points argentés en perspective, entourée d'un fin anneau orbital, sur fond noir profond. »

### 3c. Typographie

**Geist** (texte, titres) + **Geist Mono** (labels, chiffres techniques, méta). Licence OFL (Vercel).

| Fichier | Poids | Usage |
|---|---|---|
| Geist-Regular | 400 | Corps |
| Geist-Medium | 500 | Liens, emphase légère |
| Geist-SemiBold | 600 | Titres, chiffres KPI, logo |
| Geist-Bold | 700 | Rare (titres très courts) |
| GeistMono-Regular / Medium | 400/500 | Kickers, labels, footers, tableaux numériques |

Web : woff2 auto-hébergés (`assets/fonts/`, aucune requête Google). PDF : TTF (`brand/pdf/assets/fonts/`).

**Échelle web**

| Élément | Taille | Poids | Interlettrage |
|---|---|---|---|
| H1 hero | `clamp(44px, 8.4vw, 120px)`, lh .95 | 600 | −0,045 em |
| H2 | `clamp(34px, 5vw, 64px)`, lh 1 | 600 | −0,035 em |
| H3 carte | 26 px | 600 | −0,025 em |
| Lede | `clamp(17px, 1.6vw, 20px)` | 400 | — |
| Corps | 17 px / 1,6 | 400 | — |
| Kicker | 12 px, MAJ, Mono | 400 | +0,2 em |

**Échelle PDF (A4)**

| Élément | Taille | Poids |
|---|---|---|
| Titre couverture | 40 pt, lh .98 | 600, −0,04 em |
| H2 section | 22 pt | 600, −0,03 em |
| H3 | 12,5 pt | 600 |
| Chiffre KPI | 22 pt | 600 |
| Lead | 11,5 pt | 400 |
| Corps | 10 pt / 1,55 | 400 |
| Actions, tableaux | 8,8–10,5 pt | 400/600 |
| Kicker / labels / badges | 6,8–8 pt Mono MAJ | 400–500 |
| Footer | 7–7,5 pt Mono | 400 |

### 3d. Identité & contact

| Élément | Valeur |
|---|---|
| Marque | botfx (toujours en minuscules) |
| Personne | François Dasylva (en un mot — jamais « Da Sylva ») |
| Statut | Entrepreneur individuel · SIRET 53916294100022 · TVA FR61539162941 |
| Site | botfx.fr |
| Email | contact@botfx.fr · données perso : dpo@botfx.fr |
| LinkedIn | linkedin.com/in/francois-dasylva |
| GitHub | github.com/TheFSilver |
| Tagline | « Vos opérations, en pilote automatique. » |
| Promesse | « Je ne vends pas des heures. Je supprime des tâches. » |

**Textes récurrents PDF** : en-tête gauche `● botfx` · en-tête droit titre courant (doc · domaine, Mono MAJ) · pied gauche `botfx.fr · contact@botfx.fr` · centre `CONFIDENTIEL` · droite `Page X / Y`.

### 3e. Espacements & formes

| Élément | Web | PDF |
|---|---|---|
| Marges page | `--pad: clamp(20px,4vw,40px)`, max 1180 px | 22 mm / 16 mm (haut-bas / côtés) |
| Rayon cartes | 18 px | 8 pt |
| Rayon pilules (boutons, badges, tags) | 999 px | 10–20 pt |
| Bordure | 1 px `--line` | 0,6 pt `--rule` |
| Espace entre cartes | 16 px | 8 pt |
| Section | `clamp(90px,12vw,150px)` vertical | 1 section = 1 page |

---

## 4. KIT PDF — FRAMEWORK CSS (`brand/pdf/assets/style.css`)

### Pages
- `@page` : A4, fond blanc, en-têtes/pieds en couleurs **littérales** (WeasyPrint ne résout pas `var()` dans `@page`).
- `@page cover` / `@page backcover` : marge 0, fond `#050506`, sans en-tête/pied.
- Thème sombre : `--theme dark` → `data-theme="dark"` sur `<html>` + `DARK_PAGE_CSS` injecté (fond et marges réécrits).
- Titre courant : `.doc-title { string-set: doc-title content() }` placé **dans la 1re page intérieure** (pas avant la couverture, pas en `display:none`, sinon WeasyPrint l'ignore).

### Composants (classes)

| Composant | Classes | Macro Jinja |
|---|---|---|
| Couverture | `.cover .glow .art .brand .content .eyebrow h1 .client .domain .meta` | `ui.cover(title, client, domain, eyebrow, date, sphere)` |
| Sommaire cliquable | `.toc li .n a` (+ numéro de page via `target-counter`) | `ui.toc(sections)` |
| Titre de section | `.kicker` + `h2#id` | `ui.section_title(id, n, title)` |
| Synthèse | `.synthesis` (filet noir à gauche) | — |
| KPI | `.kpis .kpi .label .value .unit .delta.up/.down/.flat` | `ui.kpis(items)` |
| Action | `.action .head .num .title .body .tags .badge` | `ui.action(n, a)` |
| Badges | `.badge.done` (vert) `.progress` (ambre) `.todo` (gris) `.high` (plein noir = impact fort) | — |
| Barre de score | `.score-bar .label .track .fill.after` + repère `.fill.before` | `ui.score_bar(label, before, after)` |
| Tableau | `table th td td.num` ; ancienne valeur `<span class="before">` barrée | — |
| Encadrés | `.callout` · `.callout.warn` · `.callout.ok` | — |
| Code | `pre` / `.code` (fond `#0B0B0D`, Mono 7,8 pt) | — |
| 4e de couverture | `.back .art .content .logo .tagline .contact .legal` | `ui.back(sphere)` |

### Règles de mise en page
- `.page { page-break-after: always }` — une section = une page.
- `page-break-inside: avoid` sur `.card .action .kpi tr .callout .score-bar`.
- `orphans/widows: 3` ; `h2, h3, .kicker { page-break-after: avoid }`.
- Pas de `background-clip: text` en PDF (non supporté) → l'argent devient `#C9CCD1` plein (`.silver`).

---

## 5. RAPPORT SEO — SCHÉMA DE DONNÉES (`examples/rapport_seo.json`)

```jsonc
{
  "title": "Rapport d'actions SEO", "eyebrow": "Référencement · Bilan trimestriel",
  "client": "…", "domain": "…", "date": "Octobre 2026", "period": "…", "sources": ["Google Search Console", "…"],
  "intro": "…",
  "sections": [{"id": "synthese", "title": "Synthèse"}, {"id": "actions", …}, {"id": "resultats", …}, {"id": "suite", …}],
  "synthesis": ["paragraphe", "…"],
  "kpis":   [{"label": "Clics organiques", "value": "+38", "unit": "%", "delta": "vs trimestre précédent", "trend": "up|down|flat"}],
  "scores": [{"label": "SEO technique", "before": 54, "after": 91}],      // before: null si pas de mesure initiale
  "actions_intro": "…",
  "actions": [{"title": "…", "detail": ["…"], "status": "done|progress|todo", "impact": "Fort|Moyen|Faible", "area": "On-page"}],
  "results_intro": "…",
  "results": [{"label": "…", "before": "1 240", "after": "1 712", "delta": "+38 %", "trend": "up"}],
  "pages_table": [{"page": "/url/", "query": "…", "pos_before": "34", "pos_after": "7", "clicks": "212"}],
  "callouts": [{"kind": "warn|ok", "title": "À surveiller", "text": "…"}],
  "next_steps": [ /* même format qu'actions */ ]
}
```

**Structure du PDF** : Couverture → Sommaire (+ intro, période, sources) → 01 Synthèse (KPI + scores avant/après) → 02 Actions menées → 03 Résultats (tableau avant/après + pages qui progressent + encadrés) → 04 Prochaines étapes → 4e de couverture.

### Nouveau type de document
1. Créer `templates/mon_doc.html` : `{% extends "base.html" %}` + `{% import "macros.html" as ui %}`.
2. Réutiliser `ui.cover`, `ui.section_title`, `ui.kpis`, `ui.action`, `ui.back`.
3. `python3 generate_report.py data.json out.pdf --template mon_doc.html`.
4. Ajouter un cas au test (`tests/test_pdf_kit.py`) **avant** d'écrire le template.

---

## 6. WEB — COMPOSANTS & COMPORTEMENTS (botfx.fr)

| Élément | Comportement |
|---|---|
| Hero | Sphère canvas animée (rotation lente + parallaxe souris), titre révélé mot par mot (`[data-split]`), reflet argent qui balaie les mots argentés |
| Cartes services (bento 6 colonnes) | Halo + bordure lumineuse qui suit le curseur (`--mx/--my`), léger soulèvement |
| Boutons | Pilules ; primaire blanc/noir ; effet magnétique (`[data-magnetic]`) |
| Manifeste | Mots qui s'allument au scroll (`[data-scrub]`), gris `#5C6067` → blanc |
| Méthode | Ligne de progression liée au scroll |
| Contact | E-mail géant en argent + bouton « Copier l'adresse » (retour visible + `role=status`) |
| Bandeau défilant | Technologies en Mono, masque dégradé sur les bords, décoratif (`aria-hidden`) |
| Grain | Bruit SVG en `overlay` à 5 % sur toute la page |

---

## 7. MOTION DESIGN

| Paramètre | Valeur |
|---|---|
| Easing signature | `cubic-bezier(.22, 1, .36, 1)` (expo-out doux) |
| Révélation (fade + translateY 26 px) | 1 s, décalage 0,08–0,1 s entre éléments |
| Mot par mot (titre) | translateY 105 % → 0, 1 s, +0,07 s par mot |
| Reflet argent | cycle 7 s, balayage sur 30 % du cycle, départ 1,6 s |
| Bandeau | 38 s, linéaire, infini |
| Hover cartes | 0,4–0,5 s |
| Sphère | rotation ≈ 0,12 rad/s, inertie souris 4 %/frame |

**Règles d'accessibilité (non négociables)**
- `prefers-reduced-motion` respecté **et** bouton « Mettre en pause les animations » (WCAG 2.2.2), choix mémorisé.
- Un élément visible au chargement n'est **jamais semi-transparent** : glissement seul, pas de fondu (les scanners mesurent le contraste en plein fondu).
- Animations décoratives en `aria-hidden` ; texte réel disponible pour les lecteurs d'écran.

**Vidéo (Remotion)** : 30 fps standard / 60 fps fluide · 1920×1080 et 1080×1920 · zones de sécurité 5 % · même easing `EASE`.

---

## 8. TAILWIND (Remotion / futurs projets)

```ts
// tailwind.config.ts — extend
colors: {
  botfx: { black: "#050506", black2: "#0B0B0D", card: "#111114", fg: "#F5F5F6", muted: "#A3A7AE", dim: "#878B93",
           paper: "#FFFFFF", paper2: "#F6F6F7", rule: "#E4E4E7", ink: "#0A0A0B", ink2: "#3F3F46", ink3: "#71717A" },
  status: { positive: "#1F9D63", warning: "#B7791F", negative: "#C8413A" },
},
fontFamily: { sans: ["Geist", "ui-sans-serif", "system-ui"], mono: ["Geist Mono", "ui-monospace"] },
backgroundImage: { silver: "linear-gradient(180deg,#fff 0%,#d9dce1 38%,#8b9098 72%,#c9ccd1 100%)" },
transitionTimingFunction: { botfx: "cubic-bezier(.22,1,.36,1)" },
borderRadius: { card: "18px" },
```

---

## 9. TON & ÉCRITURE

- **Phrases courtes, verbes d'action, pas de jargon gratuit.** « Je supprime des tâches », pas « solutions innovantes ».
- **Aucune affirmation non prouvée** (« top 1 % », « expert n°1 »…). Des chiffres sourcés ou rien.
- **Français soigné** : espaces insécables avant `: ; ! ?` (`&nbsp;` en HTML), guillemets « », « botfx » en minuscules.
- **Transparence** : mention d'usage de l'IA (AI Act art. 50) et des liens affiliés (loi 2023-451) quand pertinent.
- Rapports : chaque chiffre a sa **période** et sa **source**.

---

## 10. CHECKLISTS

### Nouveau PDF
- [ ] Données dans un JSON calqué sur `examples/rapport_seo.json` (marquer les données fictives)
- [ ] Thème : clair (lecture/impression, défaut) ou sombre (présentation écran)
- [ ] `python3 generate_report.py … ` puis `python3 tests/test_pdf_kit.py` vert
- [ ] Vérifier visuellement : `pdftoppm -r 70 -png sortie.pdf aperçu`
- [ ] Polices : `pdffonts sortie.pdf` → uniquement Geist / GeistMono
- [ ] Chaque chiffre : période + source ; aucune donnée personnelle d'un tiers non nécessaire

### Nouveau visuel (réseaux, bannière)
- [ ] Fond `#050506`, sphère argentée, texte Geist, argent sur le mot clé
- [ ] Gabarit HTML dans `tools/` → capture Playwright `channel="chrome"` en @2x
- [ ] Zone protégée : photo de profil LinkedIn en bas à gauche → texte à droite

### Nouvelle page web
- [ ] Test (`tests/test_site.py`) écrit avant le code, sabotage pour prouver qu'il mord
- [ ] axe 0 violation (mouvement réduit et plein), Aequa 100/100
- [ ] Aucune requête tierce, aucun cookie
