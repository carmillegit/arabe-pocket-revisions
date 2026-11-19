"""Génère un MP3 par mot avec Piper (voix arabe libre), à partir du texte vocalisé.

Usage : tts.py MODEL OUT_DIR id=texte [id=texte ...]

Réglages, issus des essais :
- forme de pause : soukoun sur la dernière lettre, et ة final lu comme ه (qiṭṭa, pas qiṭṭat) ;
- un « ! » final : sans lui, le modèle s'arrête parfois en pleine consonne finale (fin de mot coupée) ;
- débit ralenti, et silence avant et après (iOS coupe parfois le tout début d'un son) ;
- contrôle : on signale tout mot dont la fin reste trop forte (coupure probable).
"""
import io
import math
import re
import struct
import subprocess
import sys
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

VOWELS = 'ً-ْ'
model, out_dir, *pairs = sys.argv[1:]
out = Path(out_dir)
out.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(model)
config = SynthesisConfig(length_scale=1.7, noise_w_scale=0.5)


def pause_form(text: str) -> str:
    """Forme de pause : ة final → ه, soukoun sur la dernière lettre de chaque mot."""
    words = []
    for w in text.split():
        w = re.sub(f'ة([{VOWELS}]*)$', 'ه', w)
        w = re.sub(f'[{VOWELS}]*$', '', w)  # retire toute voyelle finale (désinence)
        if w and w[-1] not in 'اىو' and not w.endswith('ّ'):
            w += 'ْ'
        words.append(w)
    return ' '.join(words) + '!'


def tail_ratio(wav_bytes: bytes) -> float:
    """Énergie des 30 dernières ms rapportée à l'énergie moyenne : élevée = fin coupée."""
    w = wave.open(io.BytesIO(wav_bytes))
    n = w.getnframes()
    s = struct.unpack('<%dh' % n, w.readframes(n))
    rms = lambda a: math.sqrt(sum(x * x for x in a) / max(1, len(a)))
    return rms(s[-int(w.getframerate() * 0.03):]) / max(1.0, rms(s))


problems = []
for pair in pairs:
    wid, text = pair.split('=', 1)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        voice.synthesize_wav(pause_form(text), wf, syn_config=config)
    data = buf.getvalue()
    ratio = tail_ratio(data)
    if ratio > 0.15:
        problems.append(f'{wid} {text} (fin à {ratio:.0%})')
    wav_path = out / f'{wid}.wav'
    wav_path.write_bytes(data)
    mp3 = out / f'{wid}.mp3'
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav_path),
         '-af', 'adelay=150,apad=pad_dur=0.35', '-ac', '1', '-b:a', '48k', str(mp3)],
        check=True,
    )
    wav_path.unlink()
    print(f'{wid} {text} → {pause_form(text)}  fin {ratio:.0%}')

if problems:
    print('\nÀ vérifier (fin peut-être coupée) :', *problems, sep='\n  ')
