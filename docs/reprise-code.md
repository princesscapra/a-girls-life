# Guide de reprise du code

## 1. Lancer localement

```bash
npm start
```

Puis ouvrir `http://localhost:8080`.

## 2. Check rapide avant modif

1. Verifier `data/feature-flags.json`
2. Verifier que les JSON data sont valides
3. Verifier le chargement via `/api/bootstrap`

## 3. Modifier le comportement sans coder

Tout passe par des booleens dans `data/feature-flags.json`.

Exemples utiles:

- Couper la mortalite:
  - `simulation.enableMortality: false`
- Cacher la popup de naissance:
  - `ui.showBirthModal: false`
- Retirer une categorie entiere:
  - `eventCategories.discrimination: false`
- Bloquer le hot reload des donnees:
  - `api.allowDataReload: false`

## 4. Ajouter un evenement

1. Choisir le fichier:
   - categorie: `data/<categorie>/events.json`
   - global: `data/events.json`
2. Ajouter:
   - `id` unique
   - `category`
   - `label`
   - `probabilityAnnual`
   - `sourceId`
3. Ajouter la source dans `data/sources.json` si besoin
4. Redemarrer serveur ou appeler `/api/reload-data` si autorise

## 5. Debug standard

- Event absent:
  - verifier booleen de categorie dans `feature-flags.json`
  - verifier `id` duplique dans les JSON
- UI absente:
  - verifier flags `ui.*`
- API reload refusee:
  - verifier `api.allowDataReload`

## 6. Convention de refactor

- Garder logique metier dans `server/simulation.js`
- Garder chargement donnees dans `server/repository.js`
- Garder affichage/interaction dans `public/app.js`
- Eviter de melanger UI et regles probabilistes
