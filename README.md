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

## Audio (synthèse vocale libre)

Les fichiers audio sont générés **une seule fois**, hors ligne, avec [Piper](https://github.com/OHF-Voice/piper1-gpl) (logiciel libre) et la voix arabe `ar_JO-kareem-medium`.
Le script `scripts/tts.py` applique la forme de pause (le ة final se prononce « a », pas « at »), un débit ralenti et un court silence avant et après chaque mot.
Les fichiers sont signalés comme synthétiques dans l'app. Ceux que la professeure juge mal rendus sont remplacés par des enregistrements humains.
