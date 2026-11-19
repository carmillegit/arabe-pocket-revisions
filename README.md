# Révisions d'arabe

Web app mobile (PWA) pour réviser l'arabe littéral : mots, cartes, QCM, révision espacée (5 boîtes), progression.
Les données restent sur le téléphone (IndexedDB). Export / import JSON dans Réglages.

## Commandes

- `npm install` puis `npm run dev` : lancer en local
- `npm test` : tests automatisés
- `npm run build` : version de production dans `dist/`

## Organisation

- `src/domain/` : règles métier pures (texte arabe, boîtes, QCM, statistiques), testées dans `tests/`
- `src/data/` : accès aux données derrière une interface unique (`repository.ts`), remplaçable par un serveur en V1
- `src/ui/` : écrans
- `src/seed/mots_depart.json` : les 57 mots de départ, importés au premier lancement
