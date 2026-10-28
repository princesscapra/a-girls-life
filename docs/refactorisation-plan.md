# Plan de refactorisation (etape suivante)

Ce qui a ete fait:

- Centralisation des booleens dans `data/feature-flags.json`
- Branchage backend + moteur + frontend sur ces booleens
- Documentation de reprise ajoutee

Refactorisation proposee en phase 2:

1. Decouper `public/app.js` en modules:
   - `public/ui/renderers.js`
   - `public/ui/journal.js`
   - `public/services/api.js`
   - `public/state/store.js`
2. Extraire les constantes serveur:
   - `server/config/constants.js`
3. Ajouter tests minimum:
   - test chargement flags
   - test filtrage categories
   - test probabilites avec flags off/on
4. Ajouter validation schema JSON (events/sources/flags)
5. Ajouter changelog data et version de dataset

Critere de validation phase 2:

- Fichier principal frontend < 200 lignes
- 80% des comportements critiques couverts par tests unitaires
- Aucun endpoint casse
- Zero duplication des defaults de flags
