# Décisions produit

Complète le cahier des charges V0. Les décisions sont classées de la plus récente à la plus ancienne.

## Audio (lot 3)

- **Piper** (logiciel libre, voix `ar_JO-kareem`), sans compte ni GAFAM. Génération unique, fichiers livrés avec l'app (5 à 8 Ko par mot).
- Diagnostic : voyelles respectées ; ع ح ق corrects ; ص ط ض distinguées de س ت د. ظ est proche de ذ. Le ة final était lu « t » : corrigé (forme de pause).
- L'app est présentée comme une **version bêta** à la professeure et aux élèves.

## Lot 2 : retours de test (2)

- Accueil : le compteur du jour **descend** à chaque réponse (objectif : 20). Une fois atteint : « ✓ Séance du jour terminée » + « N questions vues aujourd'hui » + bouton « Encore 10 ».
- Niveaux de maîtrise : **rouge** (à apprendre), **orange** (en cours), **vert** (acquis), toujours doublés d'un symbole (✕ ◐ ✓, avec le libellé pour VoiceOver), pour les personnes daltoniennes. On évite « … », qui ressemble aux points des lettres.
- Liste des mots : tri (A→Z, à apprendre d'abord, acquis d'abord) et filtre par niveau.

## Lot 2 : retours de test

- Accueil : « À réviser aujourd'hui » affiche la taille de la séance du jour (20 au maximum), plus jamais tout le stock en attente.
- Deux compteurs séparés : Vocabulaire et Lettres (28), en « su / à apprendre ». « Su » = réussi au moins une fois à échéance sur toutes ses compétences actives (boîte 2 ou plus).
- Écriture niveau 2, « de mémoire » : on donne le nom, le son et la position, on trace sans modèle, puis on révèle et on s'auto-note. Automatique en révision à partir de la boîte 3.
- Les pièges de translittération sont difficiles, mais on les garde.
- Grille de l'alphabet : ne déborde plus sur petit écran.
- Icône : option B, ض violet sur fond jaune (« la langue du ḍād »).

## Lot 2 : lettres, lecture, tracé

- **Photo → mots** : pas de solution payante pour l'instant. À reconsidérer en V1 (elle a besoin du serveur).
- **Thème** violet et jaune. Les contrastes sont vérifiés par le calcul (WCAG AA). Le jaune s'utilise toujours avec du texte foncé.
- **Lettre → nom et son** : la lettre est montrée isolée tant qu'elle est nouvelle, puis sous ses 4 formes, pour être validée sous toutes ses formes.
- **Lecture** : les pièges de translittération testent le vrai déchiffrage (ā/a, ḥ/h, ṣ/s, chadda…). Sans voyelles, pas de piège sur les voyelles.
- **Tracé** en deux étapes : la forme (squelette sans points ni hamza), puis les points et les voyelles (facultatif). Les flèches de sens s'affichent pour les lettres en boîte 1 et 2.
- Les données de tracé des 28 lettres (`src/domain/strokes.ts`) sont **à valider par la professeure**.
- Le calcul de la position des lettres (base de la dictée tracée du lot 3) est déjà en place et testé sur 24 mots.

## V1 : comptes et partage (décidé le 19/11/2026)

- **Sans compte** : l'app reste utilisable. On a accès à la liste commune validée, et la progression reste sur le téléphone.
- **Avec un compte** (lien envoyé par e-mail) : sauvegarde automatique, synchronisation entre appareils, possibilité de proposer des mots.
- **Mots perso** : un membre ajoute un mot pour lui seul. Le mot est visible tout de suite, mais uniquement par lui.
- **Propositions à la liste commune** : elles sont visibles par tous seulement après validation.
- **Rôles** : l'administratrice et la professeure ont les mêmes droits (valider, modifier, supprimer).
- **Plus tard** : phrases et textes ajoutés par les membres.

## Lot 1 : retours de la phase de test

- Le prénom est facultatif et se règle dans Réglages. Il n'est plus écrit dans le code.
- Navigation depuis Réglages sur iPhone : corrigée.

## Cadrage du lot 1

- L'exercice « Lecture » demande la translittération, pas le sens (sinon il ferait doublon avec le vocabulaire).
- La progression porte sur un « élément » : un mot ou une lettre.
- Révision globale : la lecture se fait avec voyelles, puis sans voyelles une fois débloquée. Le vocabulaire alterne cartes et QCM dans les deux sens. L'écriture se travaille par le tracé.
- Seule une réponse donnée à échéance fait monter de boîte. Une erreur fait toujours redescendre.
- L'écriture est active pour les 28 lettres, puis mot par mot sur activation.
- Les variantes (أ إ آ ؤ ئ ى ة) sont rattachées à leur lettre de base. La hamza seule a sa propre ligne. Une lettre est acquise quand toutes ses formes sont maîtrisées.
- Images : emojis ou couleurs. Translittération : boutons pour ā ī ū ḥ ṣ ḍ ṭ ẓ ʿ ʾ.
- Audio (lot 3) : Azure AI Speech recommandé.
