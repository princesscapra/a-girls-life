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

## Etat de maturite

MVP technique en construction. Les probabilites doivent encore etre calibrees sur jeux de donnees harmonises France.
