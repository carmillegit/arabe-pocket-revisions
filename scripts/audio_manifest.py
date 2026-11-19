"""Reconstruit src/seed/audio.json : texte vocalisé → fichier audio, pour tous les mots livrés avec l'app.

Usage : python3 scripts/audio_manifest.py
Échoue si un fichier audio attendu manque.
"""
import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def key(s: str) -> str:
    return ' '.join(unicodedata.normalize('NFC', s).split())


def main():
    seed = json.loads((ROOT / 'src/seed/mots_depart.json').read_text())['words']
    cours = json.loads((ROOT / 'src/seed/mots_cours.json').read_text())
    files = {}
    for w in seed:
        files[key(w['arabicVoweled'])] = f"audio/{w['id']}.mp3"
    for w in cours['words']:
        files[key(w['arabicVoweled'])] = f"audio/{w['id']}.mp3"
    for r in cours['replacements']:
        files[key(r['arabicVoweled'])] = f"audio/r-{r['id']}.mp3"
    missing = [f for f in files.values() if not (ROOT / 'public' / f).exists()]
    if missing:
        sys.exit(f'Fichiers audio manquants : {missing}')
    out = {'voice': 'Piper ar_JO-kareem-medium (synthèse)', 'files': files}
    (ROOT / 'src/seed/audio.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(len(files), 'mots avec audio')


if __name__ == '__main__':
    main()
