# Architecture technique

## Vue d'ensemble

Le projet est un MVP full JavaScript vanilla:

- Frontend statique dans public
- Serveur HTTP Node natif dans server
- Donnees JSON versionnables dans data

Flux principal:

1. Le navigateur charge `/api/bootstrap`.
2. Le serveur retourne les sources, evenements exposes et feature flags.
3. Le frontend lance `POST /api/state/create`.
4. A chaque tick, le frontend appelle `POST /api/state/advance`.

## Dossiers

- public
  - `index.html`: structure UI
  - `styles.css`: style
  - `app.js`: orchestration frontend
- server
  - `index.js`: routage API + static
  - `repository.js`: chargement donnees + application des flags
  - `simulation.js`: moteur probabiliste annuel
- data
  - `events.json`: events racine
  - `sources.json`: metadonnees des sources
  - `<categorie>/events.json`: events classes par categorie
  - `feature-flags.json`: configuration booleenne

## Feature flags

Source unique: `data/feature-flags.json`

Sections:

- `data.loadCategoryEvents`: inclure/exclure `data/<categorie>/events.json`
- `data.loadRootEvents`: inclure/exclure `data/events.json`
- `api.allowDataReload`: autorise/refuse `POST /api/reload-data`
- `simulation.enableIdentityTransition`: active/desactive transitions identitaires
- `simulation.enableMortality`: active/desactive mortalite
- `ui.showBirthModal`: affiche/cache la popup de naissance
- `ui.showSensitiveFilter`: affiche/cache la section de filtres
- `ui.showIdentityCard`: affiche/cache la fiche identite
- `ui.showActivityLog`: affiche/cache le journal technique
- `ui.autoStartAfterBirth`: autoplay automatique apres naissance
- `eventCategories.<categorie>`: active/desactive une categorie complete

Regle de fallback:

- flag absent => comportement actif (`true`)

## Points d'entree

- Serveur: `npm start` -> `server/index.js`
- API:
  - `GET /api/bootstrap`
  - `POST /api/state/create`
  - `POST /api/state/advance`
  - `POST /api/reload-data` (si autorise)

## Endroits a etendre

- Nouvelles categories: ajouter `data/<nouvelle-categorie>/events.json`
- Nouvelles regles metier: `server/simulation.js`
- Nouvelles sections UI: `public/index.html` + `public/app.js`
