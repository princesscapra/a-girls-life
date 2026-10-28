# A Girl's Life - MVP low-tech

Simulateur de vie (naissance -> deces) en mode sobre: 5 secondes reelles = 1 an simule.

## Objectifs

- Simuler des evenements de vie probabilistes pour femmes cis et trans.
- Afficher explicitement la source de chaque evenement.
- Garder une architecture low-tech: HTML/CSS/JS vanilla + serveur Node natif.
- Generer automatiquement le profil initial (aleatoire) sans choix manuel joueur.

## Lancer en local

```bash
npm start
```

Puis ouvrir http://localhost:8080

## Choix techniques low-tech

- Aucune librairie front lourde.
- Aucune API externe necessaire a l'execution.
- Assets minimaux, pages statiques, JS modulaire court.

## Structure

- `public/` interface web
- `server/` API minimale + moteur de simulation
- `data/` evenements et sources
- `docs/` methode et hypotheses

## Feature flags (booleens)

Le projet est parametre via `data/feature-flags.json`.

Principes:

- Tous les flags sont des booleens (`true`/`false`).
- Si un flag est absent, la valeur par defaut est `true`.
- Les flags sont charges au demarrage et exposes au frontend via `/api/bootstrap`.

Zones disponibles:

- `data`: activer/desactiver le chargement des events racine et categories.
- `api`: autoriser/interdire `POST /api/reload-data`.
- `simulation`: activer/desactiver la transition d'identite et la mortalite.
- `ui`: afficher/masquer certaines sections et comportements UI.
- `eventCategories`: activer/desactiver des categories completes d'evenements.

Exemple rapide:

```json
{
	"simulation": {
		"enableMortality": false
	},
	"ui": {
		"showBirthModal": false
	},
	"eventCategories": {
		"discrimination": false
	}
}
```

## Reprendre le code rapidement

Voir:

- `docs/architecture.md`
- `docs/reprise-code.md`
- `docs/refactorisation-plan.md`

## Etat de maturite

MVP technique en construction. Les probabilites doivent encore etre calibrees sur jeux de donnees harmonises France.
