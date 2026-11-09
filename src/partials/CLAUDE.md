# CLAUDE.md — src/partials/

Blocs HTML inclus dans `src/pages/*.html` avec `{{> nom}}` (inclusions imbriquées possibles). `build.py` remplace aussi `{{crumbs}}` par le fil d'Ariane issu de la ligne `fil:` de la page.

- Un bloc avec `data-play` charge `assets/css/play.css` et `assets/js/play.js` sur sa page.
- Les espaces insécables du français sont posés par `build.py` (`typo`) dans le HTML. Dans `play.js`, passer les textes par `nb()`.
- FAQ : `<details class="faq"><summary>…</summary><div class="rep">…</div></details>`. `build.py` en tire le JSON-LD FAQPage.
- Dépôt public : aucun nom de client, aucun chiffre client. Études de cas anonymisées, statut réel affiché.
- Charte : `brand/BOTFX_DESIGN_SYSTEM.md`. Tout effet doit s'arrêter avec `[data-motion=reduced]`, et chaque contrôle fait au moins 44 px.
- Comportements testés dans `tests/test_site.py` : écrire le test avant, prouver par sabotage.
