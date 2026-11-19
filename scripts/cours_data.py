"""Contenu des fiches de cours, validé par Camille (relecture du 19/11/2026).

Produit :
- src/content/cours.json : les fiches affichées dans l'onglet Cours ;
- src/seed/mots_cours.json : les mots nouveaux à ajouter à l'app (et les remplacements).

Usage : python3 scripts/cours_data.py
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOWELS = re.compile('[ً-ْٰ]')


def plain(s: str) -> str:
    return VOWELS.sub('', unicodedata.normalize('NFC', s)).strip()


# Une ligne de vocabulaire : (arabe, translittération, français, options)
# options : emoji, type ('mot', 'pluriel', 'verbe'), a_verifier, app=False (ne pas ajouter à l'app)

SESSIONS = [
    {
        'id': 's1',
        'date': '2026-10-07',
        'title': 'Histoire de la langue et alphabet',
        'blocks': [
            {'type': 'rules', 'title': 'Histoire de la langue arabe', 'items': [
                'Le plus ancien manuscrit en arabe date du IIIe siècle. Auparavant, l’arabe était surtout une langue véhiculaire : la langue des poètes.',
                'Au VIIe siècle, avec le Coran, l’arabe devient une langue écrite et une langue liturgique.',
                'L’arabe fait partie de la famille des langues afro-asiatiques (ou chamito-sémitiques). Avec l’hébreu, c’est l’une des principales langues sémitiques encore vivantes.',
                'Plus de 300 millions de personnes le parlent. Depuis 1974, c’est l’une des six langues officielles des Nations unies, avec l’anglais, le chinois, l’espagnol, le français et le russe.',
                'L’arabe est la langue officielle de 22 pays arabes. Il est aussi parlé dans 13 autres pays sans y être langue officielle.',
                'Le « monde arabe » se dit العَالَم العَرَبِيّ (al-ʿālam al-ʿarabī) ou الوَطَن العَرَبِيّ (al-waṭan al-ʿarabī, « la patrie arabe »).',
            ]},
            {'type': 'rules', 'title': 'Les cinq grands espaces du monde arabe', 'items': [
                'Grand Maghreb : Mauritanie, Maroc, Algérie, Tunisie, Libye.',
                'Vallée du Nil : Égypte, Soudan.',
                'Corne de l’Afrique : Djibouti, Somalie, Comores.',
                'Croissant fertile : Palestine, Liban, Jordanie, Syrie, Irak.',
                'Péninsule arabique (pays du Golfe) : Arabie saoudite, Yémen, Oman, Émirats arabes unis, Qatar, Bahreïn, Koweït.',
                'Le Maghreb المَغْرِب (« le couchant ») désigne les pays de l’ouest et le Machrek المَشْرِق (« le levant », là où le soleil se lève) ceux de l’est.',
            ]},
            {'type': 'vocab', 'title': 'Les 22 pays', 'category': 'Pays', 'rows': [
                ('الجَزَائِر', 'al-Jazāʾir', 'Algérie', {'emoji': '🇩🇿'}),
                ('البَحْرَيْن', 'al-Baḥrayn', 'Bahreïn', {'emoji': '🇧🇭'}),
                ('جُزُر القَمَر', 'Juzur al-Qamar', 'Comores', {'emoji': '🇰🇲'}),
                ('جِيبُوتِي', 'Jībūtī', 'Djibouti', {'emoji': '🇩🇯'}),
                ('مِصْر', 'Miṣr', 'Égypte', {'emoji': '🇪🇬'}),
                ('العِرَاق', 'al-ʿIrāq', 'Irak', {'emoji': '🇮🇶'}),
                ('الأُرْدُنّ', 'al-Urdunn', 'Jordanie', {'emoji': '🇯🇴'}),
                ('الكُوَيْت', 'al-Kuwayt', 'Koweït', {'emoji': '🇰🇼'}),
                ('لُبْنَان', 'Lubnān', 'Liban', {'emoji': '🇱🇧'}),
                ('لِيبْيَا', 'Lībyā', 'Libye', {'emoji': '🇱🇾'}),
                ('مُورِيتَانْيَا', 'Mūrītānyā', 'Mauritanie', {'emoji': '🇲🇷'}),
                ('المَغْرِب', 'al-Maghrib', 'Maroc', {'emoji': '🇲🇦'}),
                ('عُمَان', 'ʿUmān', 'Oman', {'emoji': '🇴🇲'}),
                ('فِلَسْطِين', 'Filasṭīn', 'Palestine', {'emoji': '🇵🇸'}),
                ('قَطَر', 'Qaṭar', 'Qatar', {'emoji': '🇶🇦'}),
                ('العَرَبِيَّة السَّعُودِيَّة', 'al-ʿArabiyya as-Saʿūdiyya', 'Arabie saoudite', {'emoji': '🇸🇦'}),
                ('الصُّومَال', 'al-Ṣūmāl', 'Somalie', {'emoji': '🇸🇴'}),
                ('السُّودَان', 'al-Sūdān', 'Soudan', {'emoji': '🇸🇩'}),
                ('سُورِيَا', 'Sūriyā', 'Syrie', {'emoji': '🇸🇾'}),
                ('تُونِس', 'Tūnis', 'Tunisie', {'emoji': '🇹🇳'}),
                ('الإِمَارَات', 'al-Imārāt', 'Émirats arabes unis', {'emoji': '🇦🇪'}),
                ('اليَمَن', 'al-Yaman', 'Yémen', {'emoji': '🇾🇪'}),
            ]},
            {'type': 'rules', 'title': 'L’alphabet : 28 lettres', 'items': [
                'Dans l’ordre, avec leur nom : ا alif, ب bāʾ, ت tāʾ, ث thāʾ, ج jīm, ح ḥāʾ, خ khāʾ, د dāl, ذ dhāl, ر rāʾ, ز zāy, س sīn, ش shīn, ص ṣād, ض ḍād, ط ṭāʾ, ظ ẓāʾ, ع ʿayn, غ ghayn, ف fāʾ, ق qāf, ك kāf, ل lām, م mīm, ن nūn, ه hāʾ, و wāw, ي yāʾ.',
                'Pour les apprendre : Exercices → Lecture (lettre → nom et son, paires qui piègent) et Écriture (tracer les lettres).',
            ]},
        ],
    },
    {
        'id': 's2',
        'date': '2026-10-14',
        'title': 'La vocalisation, l’alif et la hamza',
        'blocks': [
            {'type': 'rules', 'title': 'Consonnes, voyelles longues, voyelles courtes', 'items': [
                'L’arabe littéral compte 28 consonnes, 3 voyelles longues et 4 signes de voyelles courtes.',
                'Les voyelles courtes ne sont en général pas écrites. On les marque par de petits signes au-dessus ou au-dessous de la consonne : c’est la vocalisation.',
            ]},
            {'type': 'rules', 'title': 'Les voyelles courtes', 'items': [
                'fatha  ـَ  : son « a », petite barre au-dessus. Pour s’en souvenir : « ouvrir », on ouvre la bouche.',
                'damma  ـُ  : son « ou », petit wāw au-dessus. Pour s’en souvenir : « prendre dans les bras ».',
                'kasra  ـِ  : son « i », petite barre au-dessous. Le nom évoque « casser ».',
                'soukoun  ـْ  : petit rond au-dessus, la lettre est muette (« silence »).',
            ]},
            {'type': 'rules', 'title': 'Les voyelles longues', 'items': [
                'Ce sont trois lettres : ا alif (ā), و wāw (ū), ي yāʾ (ī). Ce sont aussi des semi-voyelles : quand elles ne servent pas de voyelle, elles se comportent comme des consonnes et portent elles-mêmes des voyelles courtes.',
                'Exemples : بَا bā (ب + ا), بُو bū (ب + و), وُو wū (و + و), بِي bī (ب + ي), يِي yī (ي + ي).',
                'On met forcément une fatha sur la consonne qui précède l’alif. Un alif non vocalisé est forcément une voyelle longue.',
                'Alif madda (« alif allongé ») : deux alifs à la suite s’écrivent آ.',
                'Un mot ne peut jamais commencer par une voyelle longue.',
            ]},
            {'type': 'rules', 'title': 'L’alif et ses particularités', 'items': [
                'Six lettres ne s’attachent jamais à la lettre suivante (à gauche) : ا د ذ ر ز و.',
                'Possessif « mon / ma » : on ajoute ي (ī) à la fin du mot. اِسْم (ism, le prénom) → اِسْمِي (ismī, mon prénom). اِسْمِي … : « je m’appelle … ».',
                'La suite ل + ا s’écrit toujours avec la ligature لا (lā, « non ») ; il en existe aussi une version calligraphiée.',
                'Alif maqṣūra ى (« alif raccourci ») : en fin de mot, il a la forme d’un yāʾ sans points et se prononce comme un alif (ā). Fréquent dans les prénoms féminins anciens.',
            ]},
            {'type': 'vocab', 'title': 'Vocabulaire', 'category': 'Cours du 14/10', 'rows': [
                ('اِسْم', 'ism', 'prénom, nom', {'emoji': '🪪'}),
                ('أَرْنَب', 'arnab', 'lapin', {}), ('أَسَد', 'asad', 'lion', {}),
                ('أَنَا', 'anā', 'je, moi', {'emoji': '🙋'}),
                ('أُمّ', 'umm', 'mère', {'emoji': '👩'}),
                ('أَخ', 'akh', 'frère', {'emoji': '👦'}),
                ('آمِين', 'āmīn', 'amen', {}),
                ('حِمَار', 'ḥimār', 'âne', {}), ('فَأْر', 'faʾr', 'souris', {}),
                ('الآن', 'al-ʾān', 'maintenant', {'emoji': '⏰'}),
                ('مَامَا', 'māmā', 'maman', {'emoji': '👩‍👧'}),
                ('أَشْيَاء', 'ashyāʾ', 'des choses, des objets', {'emoji': '📦'}),
                ('فَتًى', 'fatā', 'jeune garçon, adolescent', {'emoji': '🧒'}),
                ('شَاطِئ', 'shāṭiʾ', 'plage', {'emoji': '🏖️'}),
            ]},
        ],
    },
    {
        'id': 's3',
        'date': '2026-11-04',
        'title': 'ب ت ث, chadda, tāʾ marbūṭa, hamza',
        'blocks': [
            {'type': 'rules', 'title': 'Les formes des lettres', 'items': [
                'Chaque lettre a jusqu’à quatre formes : isolée, liée en début de mot (initiale), au milieu (médiane), en fin de mot (finale).',
                'Vocabulaire de la fiche : حَرْف (ḥarf, lettre), كَلِمَة (kalima, mot), مِثَال (mithāl, exemple), مُتَّصِل (muttaṣil, attaché, lié).',
                'Les six lettres qui ne s’attachent qu’à droite : ا alif, د dāl, ذ dhāl, ر rāʾ, ز zāy, و wāw.',
            ]},
            {'type': 'rules', 'title': 'La hamza ء', 'items': [
                'C’est un coup de glotte, comme un « eu » court et soufflé.',
                'Elle peut se poser sur les trois voyelles longues (أ ؤ ئ) ou se trouver seule, en fin de mot (ء).',
                '98 % des mots qui commencent par ا ont une hamza (أ ou إ).',
                'Selon les écoles, la hamza est considérée comme une 29e lettre, mais pas en arabe classique.',
            ]},
            {'type': 'rules', 'title': 'La chadda ـّ', 'items': [
                'La chadda (« le lien ») double le son de la consonne.',
                'On ne la trouve jamais au début d’un mot, toujours au milieu ou à la fin.',
                'Avec fatha et damma, la voyelle s’écrit au-dessus de la chadda (بَّ, بُّ) ; avec kasra, elle s’écrit au-dessous (بِّ).',
            ]},
            {'type': 'rules', 'title': 'La tāʾ marbūṭa ة', 'items': [
                'C’est une forme finale du tāʾ, qui marque le féminin singulier.',
                'Attachée ـة après une lettre qui se lie, non attachée ة sinon.',
                'La lettre qui la précède porte toujours une fatha : terminaison en « -at », prononcée « -a » en fin de phrase.',
            ]},
            {'type': 'vocab', 'title': 'Vocabulaire', 'category': 'Cours du 4/11', 'rows': [
                ('بَاب', 'bāb', 'porte', {}), ('بَابَا', 'bābā', 'papa', {'emoji': '👨‍👧'}),
                ('حَبِيب', 'ḥabīb', 'bien-aimé', {'emoji': '❤️'}), ('كَلْب', 'kalb', 'chien', {}),
                ('أَرْنَب', 'arnab', 'lapin', {}), ('دُبّ', 'dubb', 'ours', {}),
                ('أَب', 'ab', 'père', {'emoji': '👨'}), ('كِتَاب', 'kitāb', 'livre', {}),
                ('تُفَّاحَة', 'tuffāḥa', 'une pomme', {'emoji': '🍎'}), ('تِمْسَاح', 'timsāḥ', 'crocodile', {}),
                ('مِفْتَاح', 'miftāḥ', 'clé', {}), ('دَفْتَر', 'daftar', 'cahier', {'emoji': '📓'}),
                ('رَتَّبَ', 'rattaba', 'ranger (litt. « il a rangé »)', {'type': 'verbe', 'emoji': '🧹'}),
                ('بَيْت', 'bayt', 'maison', {}), ('أُخْت', 'ukht', 'sœur', {'emoji': '👧'}),
                ('أَنْتَ', 'anta', 'tu (à un garçon)', {'emoji': '👉'}), ('أَنْتِ', 'anti', 'tu (à une fille)', {'emoji': '👉'}),
                ('أَنَا', 'anā', 'je', {}),
                ('سَيَّارَة', 'sayyāra', 'une voiture', {}), ('سَيَّارَات', 'sayyārāt', 'des voitures', {'type': 'pluriel', 'emoji': '🚗', 'link': 'w031'}),
                ('نَخْلَة', 'nakhla', 'palmier, dattier', {}), ('نَمْلَة', 'namla', 'fourmi', {}),
                ('ثَلْج', 'thalj', 'neige', {}), ('ثَوْر', 'thawr', 'taureau', {}),
                ('مِثَال', 'mithāl', 'exemple', {}),
                ('وَثَبَ', 'wathaba', 'sauter (litt. « il a sauté »)', {'type': 'verbe', 'emoji': '🦘'}),
                ('مُثَلَّث', 'muthallath', 'triangle', {'emoji': '🔺'}),
                ('مِحْرَاث', 'miḥrāth', 'charrue, soc', {'emoji': '🚜'}),
            ]},
            {'type': 'vocab', 'title': 'Exercice 1 p. 19', 'category': 'Cours du 4/11', 'rows': [
                ('دَار', 'dār', 'maison (la maison familiale)', {'emoji': '🏡'}),
                ('زَارَ', 'zāra', 'rendre visite (litt. « il a rendu visite »)', {'type': 'verbe', 'emoji': '🚪'}),
                ('وَلَد', 'walad', 'enfant, garçon', {'emoji': '👦'}),
                ('لِيزَا', 'Līzā', 'Lisa (prénom)', {'app': False}),
                ('يَزُورُ', 'yazūru', 'il rend visite', {'type': 'verbe'}),
                ('وَادِي', 'wādī', 'vallée', {'emoji': '🏞️'}),
                ('وَ', 'wa', 'et', {}),
                ('لَوْز', 'lawz', 'amandes', {}), ('وَزِير', 'wazīr', 'ministre', {'emoji': '🏛️'}),
                ('رُزّ', 'ruzz', 'riz', {'emoji': '🍚'}), ('زَيْت', 'zayt', 'huile', {'emoji': '🫒'}),
                ('بَلَد', 'balad', 'pays', {'emoji': '🗺️'}), ('تُوت', 'tūt', 'mûres', {}),
                ('ثِيَاب', 'thiyāb', 'vêtements', {'emoji': '👕'}), ('بَرْد', 'bard', 'froid', {'emoji': '🥶'}),
            ]},
        ],
    },
    {
        'id': 's4',
        'date': '2026-11-13',
        'title': 'ج ح خ د ذ, fruits et légumes',
        'blocks': [
            {'type': 'rules', 'title': 'Fruits et légumes', 'items': [
                'Les noms de fruits et de légumes sont des collectifs : ils désignent le fruit en général (« des prunes »).',
                'Pour parler d’un seul fruit, on ajoute la tāʾ marbūṭa : خَوْخ (khawkh, des prunes) → خَوْخَة (khawkha, une prune). Cela ne marche que pour les fruits et les légumes.',
            ]},
            {'type': 'vocab', 'title': 'Vocabulaire', 'category': 'Cours du 13/11', 'rows': [
                ('جَبَل', 'jabal', 'montagne', {}), ('شَجَرَة', 'shajara', 'arbre', {}),
                ('دَجَاجَة', 'dajāja', 'une poule', {}), ('دَجَاج', 'dajāj', 'des poules (collectif)', {'emoji': '🐔'}),
                ('ثَلْج', 'thalj', 'neige', {}), ('حِمَار', 'ḥimār', 'âne', {}),
                ('مِحْرَاث', 'miḥrāth', 'charrue (outil agricole)', {}), ('تُفَّاحَة', 'tuffāḥa', 'une pomme', {}),
                ('بَلَح', 'balaḥ', 'dattes (fraîches, jaunes)', {}), ('قَمْح', 'qamḥ', 'blé', {'emoji': '🌾'}),
                ('مِفْتَاح', 'miftāḥ', 'clé', {}), ('خَرُوف', 'kharūf', 'mouton', {}),
                ('نَخْلَة', 'nakhla', 'palmier, dattier', {}), ('أُخْت', 'ukht', 'sœur', {}),
                ('بَطِّيخ', 'baṭṭīkh', 'pastèques', {}), ('خَوْخ', 'khawkh', 'prunes', {}),
                ('دُبّ', 'dubb', 'ours', {}), ('حَدِيقَة', 'ḥadīqa', 'jardin', {}),
                ('وَرْدَة', 'warda', 'une rose', {}), ('وَرْد', 'ward', 'des roses (collectif)', {'emoji': '💐'}),
                ('يَد', 'yad', 'main', {}), ('أَسْوَد', 'aswad', 'noir', {}),
                ('ذَيْل', 'dhayl', 'queue (d’un animal)', {}), ('أُذُن', 'udhun', 'oreille', {}),
                ('أُسْتَاذ', 'ustādh', 'enseignant', {}),
                ('أُسْتَاذَة', 'ustādha', 'enseignante ; aussi « Maître » pour une avocate', {'emoji': '👩‍🏫'}),
                ('تِلْمِيذ', 'tilmīdh', 'élève, étudiant', {}),
                ('تِلْمِيذَة', 'tilmīdha', 'élève, étudiante', {'emoji': '👩‍🎓'}),
                ('فَخِذ', 'fakhidh', 'cuisse', {}),
            ]},
        ],
        'homework': 'p. 22 G et p. 23',
    },
    {
        'id': 's5',
        'date': '2026-11-18',
        'title': 'L’article ال, ر ز س ش',
        'blocks': [
            {'type': 'rules', 'title': 'L’article défini', 'items': [
                'L’arabe n’a qu’un seul article défini, pour « le », « la » et « les » : ال (al).',
                'Il se colle au début du mot : بَيْت (bayt, une maison) → البَيْت (al-bayt, la maison).',
            ]},
            {'type': 'vocab', 'title': 'Vocabulaire', 'category': 'Cours du 18/11', 'rows': [
                ('رَجُل', 'rajul', 'un homme', {}), ('رِجَال', 'rijāl', 'des hommes', {}),
                ('سَيَّارَة', 'sayyāra', 'une voiture', {}), ('اِمْرَأَة', 'imraʾa', 'une femme', {}),
                ('شَجَر', 'shajar', 'des arbres (collectif)', {'emoji': '🌳'}),
                ('أَشْجَار', 'ashjār', 'des arbres (pluriel)', {'type': 'pluriel', 'emoji': '🌲', 'link': 'w034'}),
                ('أَحْمَر', 'aḥmar', 'rouge', {}), ('أَخْضَر', 'akhḍar', 'vert', {}),
                ('أَصْفَر', 'aṣfar', 'jaune', {}), ('ثَوْر', 'thawr', 'taureau', {}),
                ('زِرّ', 'zirr', 'bouton (de chemise, de vêtement)', {'emoji': '🔘'}),
                ('غَزَال', 'ghazāl', 'gazelle', {}), ('أَزْرَق', 'azraq', 'bleu', {}),
                ('جَزَر', 'jazar', 'carottes', {}), ('مَوْز', 'mawz', 'bananes', {}), ('خُبْز', 'khubz', 'pain', {}),
                ('سَمَكَة', 'samaka', 'poisson', {}), ('مَسْجِد', 'masjid', 'mosquée', {'emoji': '🕌'}),
                ('كَنِيسَة', 'kanīsa', 'église', {'emoji': '⛪'}), ('أُسْتَاذ', 'ustādh', 'enseignant', {}),
                ('رَأْس', 'raʾs', 'tête', {'emoji': '🧑'}), ('شَمْس', 'shams', 'soleil', {}),
                ('شَجَرَة', 'shajara', 'arbre', {}), ('حَشِيش', 'ḥashīsh', 'herbe', {'emoji': '🌿'}),
                ('فَرَاشَة', 'farāsha', 'papillon', {'emoji': '🦋'}), ('عُشّ', 'ʿushsh', 'nid', {'emoji': '🪺'}),
                ('قُمَاش', 'qumāsh', 'tissu', {'emoji': '🧵'}),
            ]},
        ],
        'homework': 'p. 18 à 24',
    },
]

# Remplacements décidés à la relecture : le cours fait référence.
REPLACEMENTS = [
    {'id': 'w056', 'from': 'بَرْقُوق', 'arabicVoweled': 'خَوْخ', 'transliteration': 'khawkh', 'french': 'prunes',
     'pronunciationHint': 'kh jota, aw', 'status': 'a_verifier',
     'note': 'Dans beaucoup de pays, خَوْخ désigne plutôt les pêches : à confirmer avec la professeure.'},
    {'id': 'w044', 'from': 'مُدَرِّس', 'arabicVoweled': 'أُسْتَاذ', 'transliteration': 'ustādh', 'french': 'enseignant',
     'pronunciationHint': 'ā long, dh comme th de this', 'status': 'valide'},
]


def main():
    seed = json.loads((ROOT / 'src/seed/mots_depart.json').read_text())
    existing = {plain(w['arabicVoweled']) for w in seed['words']}
    for r in REPLACEMENTS:
        existing.discard(plain(r['from']))
        existing.add(plain(r['arabicVoweled']))

    words, seen, cours = [], set(), []
    n = 0
    for s in SESSIONS:
        blocks = []
        for b in s['blocks']:
            if b['type'] == 'rules':
                blocks.append(b)
                continue
            rows = []
            for ar, tr, fr, opt in b['rows']:
                ar = unicodedata.normalize('NFC', ar)
                rows.append({'ar': ar, 'tr': tr, 'fr': fr})
                # Déjà dans l'app : même écriture sans voyelles. Doublon dans le cours : même écriture avec voyelles
                # (أَنْتَ et أَنْتِ sont deux mots différents).
                if opt.get('app') is False or plain(ar) in existing or ar in seen:
                    continue
                seen.add(ar)
                n += 1
                words.append({
                    'id': f'c{n:03d}',
                    'arabicVoweled': ar,
                    'transliteration': tr,
                    'french': fr,
                    'category': b['category'],
                    'type': opt.get('type', 'mot'),
                    'visual': {'kind': 'emoji', 'value': opt['emoji']} if opt.get('emoji') else None,
                    'source': 'cours',
                    'status': 'a_verifier' if opt.get('a_verifier') else 'valide',
                    'linkedWordId': opt.get('link'),
                })
            blocks.append({'type': 'vocab', 'title': b['title'], 'rows': rows})
        cours.append({'id': s['id'], 'date': s['date'], 'title': s['title'], 'blocks': blocks, 'homework': s.get('homework')})

    out = ROOT / 'src/content'
    out.mkdir(exist_ok=True)
    (out / 'cours.json').write_text(json.dumps({'version': 1, 'sessions': cours}, ensure_ascii=False, indent=1))
    (ROOT / 'src/seed/mots_cours.json').write_text(json.dumps(
        {'contentVersion': 2, 'replacements': REPLACEMENTS, 'words': words}, ensure_ascii=False, indent=1))
    print(len(cours), 'séances,', len(words), 'mots nouveaux')


if __name__ == '__main__':
    main()
