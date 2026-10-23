# botfx.fr

Le site de **botfx**, le studio de François Dasylva : web apps, SaaS, PWA, sites sur mesure, WordPress, automatisation et IA.
→ **https://botfx.fr**

Ce dépôt est public par transparence : c'est le code qui tourne en production, tests compris.

## Ce qu'il y a sous le capot

- **Zéro framework, zéro dépendance côté visiteur.** HTML, CSS et JS vanilla. Accueil ≈ 12 Ko compressés (HTML + CSS + JS), plus deux polices Geist auto-hébergées.
- **Zéro cookie, zéro traceur, zéro requête tierce**, donc pas de bandeau cookies. Un test échoue si une page appelle un domaine externe.
- **Accessibilité WCAG 2.2 AA** vérifiée par axe-core sur chaque page, plus un bouton pour mettre les animations en pause et le respect de `prefers-reduced-motion`.
- **Sécurité** : CSP stricte (hash du seul script inline, pas de `unsafe-inline` pour les scripts), HSTS, `frame-ancestors 'none'`, en-têtes générés au build.
- **SEO et IA** : données structurées `ProfessionalService`, sitemap, balises Open Graph, contenu lisible sans JavaScript.
- **Conformité** : mentions légales LCEN, transparence sur l'usage de l'IA (AI Act, art. 50), scan [Aequa](https://aequa.dev) 100/100.

## Structure

```
src/pages/      pages HTML (bloc méta en tête : titre, description, chemin)
assets/         CSS, JS, polices, images
build.py        génère dist/ : pages + en-tête/pied communs, sitemap, robots, _headers (CSP)
tests/          tests de comportement Playwright (navigation, SEO, axe, animations, en-têtes)
brand/          design system et kit PDF (rapports clients générés avec WeasyPrint)
```

## Lancer en local

```bash
python3 build.py
python3 -m http.server 8891 --directory dist &
python3 tests/test_site.py                    # ou : python3 tests/test_site.py https://botfx.fr
```

Déployé sur Cloudflare Pages à chaque push sur `main` (build `python3 build.py`, sortie `dist`).

## Licence

© François Dasylva (botfx). Tous droits réservés : textes, identité visuelle et design ne sont pas réutilisables.
Le code est lisible pour s'en inspirer. Les polices Geist sont sous licence SIL Open Font License.
