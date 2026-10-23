# CLAUDE.md — botfx-site

Site vitrine botfx.fr. Statique, généré par `build.py` (gabarit commun + `src/pages/*.html` → `dist/`).

## Règles
- **TDD comportement** : `tests/test_site.py` (Playwright Python, `channel="chrome"` — le Chromium bundlé plante sur macOS 26). Écrire le test AVANT le code, prouver par sabotage qu'il mord.
- **Zéro requête tierce, zéro cookie** : le test le vérifie. Polices auto-hébergées (`assets/fonts`). Pas de Google Fonts, pas d'analytics.
- **Accessibilité WCAG 2.2 AA** : axe à 0 violation (réduit et plein mouvement), premier écran jamais semi-transparent au chargement, bouton pause des animations (WCAG 2.2.2) persistant.
- **Liens affiliés** : `rel="sponsored"` + mention visible (loi 2023-451). Page `/outils/`.
- **Mentions légales** : mention d'usage de l'IA (AI Act art. 50). Adresse = celle du registre (Lognes) tant que le changement d'adresse AE n'est pas fait.
- Le script inline du `<head>` est autorisé par hash dans la CSP (`_headers`, calculé par `build.py`) : si tu le modifies, rebuild.
- Palette : noir #050506, argent (dégradé), blanc. Typo Geist / Geist Mono.

## Structure
- `src/pages/` : contenu des pages (bloc méta en tête : title, description, path, noindex).
- `assets/` : css, js (vanilla), fonts, favicon, og.png (généré via `tools/og.html`).
- `build.py` : génère dist/, sitemap.xml, robots.txt, _headers (CSP, HSTS, cache).

## ⚠️ Dépôt PUBLIC (GitHub TheFSilver/botfx-site)
- Jamais de données client réelles (noms, accès, chiffres) ni d'identifiants de compte dans les fichiers suivis.
- Notes internes et sauvegardes DNS : `CONTEXT_RECOVERY.md` et `ops/` sont **gitignorés** (locaux seulement).
- Exemples du kit PDF = données fictives uniquement.
