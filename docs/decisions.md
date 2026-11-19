# Décisions produit

Complète le cahier des charges V0. Les décisions sont classées de la plus récente à la plus ancienne.

## Onglet Cours (relecture des fiches du 19/11/2026)

- Les fiches sont **validées par Camille dans un fichier Word** avant d'entrer dans l'app. Ce fichier n'est pas publié (dépôt public) ; seules les données validées le sont (`scripts/cours_data.py` → `src/content/cours.json`).
- La séance sans date est la suite du 14/10 : **5 séances** au total (7/10, 14/10, 4/11, 13/11, 18/11).
- **76 mots nouveaux** ajoutés automatiquement (une fois, sans écraser les modifications de l'utilisatrice), classés dans des catégories par séance (« Cours du 4/11 »…) et « Pays » (avec drapeaux).
- Remplacements : « prunes » = خَوْخ (le cours fait référence, mais reste « à vérifier ») ; « enseignant » = أُسْتَاذ (remplace مُدَرِّس).
- Translittérations retenues pour les pays : al-Ṣūmāl, al-Sūdān (sans assimilation), Arabie saoudite = al-ʿArabiyya as-Saʿūdiyya.
- **Retour après une séance** : la croix, « Terminer » et « Retour » ramènent à l'écran de départ (fiche de cours, Exercices, Progression), sinon à l'accueil. Seuls les écrans de l'app sont acceptés comme destination.
- Navigation : **Cours** prend la place de Réglages dans la barre du bas ; Réglages est accessible par l'icône ⚙️ de l'accueil.
- Audio : correction d'un défaut du script (la chadda finale était retirée : زِرّ lu « zir ») ; 8 mots régénérés.

## Lot 3 : retour de test

- **Fin de séance** : pop-up « أَحْسَنْت (aḥsant) — Bravo, séance terminée ! », ou « مَبْرُوك (mabrūk) — Félicitations, sans faute ! » si tout est juste. Les deux formules sont écrites sans marque de genre (forme de pause), pour toute la classe. Confettis désactivés si l'iPhone est réglé pour réduire les animations.
- **Comparaison en dictée et en écriture de mémoire** : ton tracé passe en gris clair, la correction est affichée en violet franc par-dessus.

- **Filtre par activités** (choix multiple) dans « Filtrer la révision » : Cartes, QCM de sens, Lecture de mots, Lettres (nom, son, paires), Tracé, Dictée. Aucune cochée = toutes. Si l'activité habituelle d'un élément est écartée, on prend une autre activité autorisée (ex. « Cartes » seule : tout le vocabulaire passe en cartes) ; sinon l'élément est écarté. Le choix est mémorisé sur le téléphone.

- **Ligne d'écriture** sur la zone de tracé, toujours visible (y compris en mémoire et en dictée). Toutes les lettres partagent la **même taille et la même ligne**, calées sur les lettres de référence (ل pour le haut, ع ي ح pour le bas) : on voit que د reste sur la ligne, que ر passe dessous, et que ل monte haut puis descend.

## Lot 3 : audio et dictée tracée

- **Audio** des 57 mots (Piper), livré avec l'app et disponible hors connexion. Le lien se fait par le texte vocalisé : un mot ajouté avec la même écriture retrouve son audio.
- Bouton 🔊 au verso des cartes, dans les corrections et dans la fiche du mot, avec la mention « voix de synthèse ». Statut audio modifiable dans la fiche : à valider / validé / voix humaine.
- **Dictée tracée** : lecture automatique (le bouton reste disponible si l'iPhone la refuse), tracé sans modèle, « Vérifier » qui superpose la correction, puis auto-évaluation **lettre par lettre**, avec la position de chaque lettre (forme liée affichée). Le mot est réussi si toutes ses lettres sont justes. Points et voyelles : seconde passe non notée.
- En révision, l'écriture d'un mot passe du tracé guidé à la dictée dès la boîte 2, s'il a un audio.
- **Table lettre × position** : réussites, échecs, date. Stockage en version 2, avec **migration automatique**. Les sauvegardes v1 s'importent toujours.
- Progression : les 5 combinaisons lettre-position les plus ratées (« ع en milieu de mot »).
- Un mot ajouté plus tard n'a pas d'audio tant qu'on ne l'a pas généré (script `scripts/tts.py`). D'ici là, il est simplement exclu de la dictée.

## Audio (lot 3)

- **Piper** (logiciel libre, voix `ar_JO-kareem`), sans compte ni GAFAM. Génération unique, fichiers livrés avec l'app (5 à 8 Ko par mot).
- Diagnostic : voyelles respectées ; ع ح ق corrects ; ص ط ض distinguées de س ت د. ظ est proche de ذ. Le ة final était lu « t » : corrigé (forme de pause).
- Retour d'écoute : trop rapide, fins de mots coupées. Mesure : le modèle s'arrêtait en pleine consonne finale. Corrigé avec une forme de pause explicite (soukoun) + un « ! » final (fin qui s'éteint naturellement), un débit ralenti (×1,7) et 350 ms de silence final. Le script signale toute fin encore trop forte.
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
