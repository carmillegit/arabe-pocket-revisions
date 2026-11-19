"""Génère un MP3 par mot avec Piper (voix arabe libre), à partir du texte vocalisé.

Usage : tts.py MODEL OUT_DIR id=texte [id=texte ...]
"""
import io
import subprocess
import sys
import wave
from pathlib import Path

import re

from piper import PiperVoice, SynthesisConfig

model, out_dir, *pairs = sys.argv[1:]
out = Path(out_dir)
out.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(model)
# Débit plus lent qu'au naturel : on apprend.
config = SynthesisConfig(length_scale=1.35)


def pause_form(text: str) -> str:
    """Forme de pause : le ة final se prononce « a » (ou « ah »), pas « at »."""
    return re.sub(r'ة([\u064B-\u0652]*)(?=\s|$)', 'ه', text)


for pair in pairs:
    wid, text = pair.split('=', 1)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        voice.synthesize_wav(pause_form(text), wf, syn_config=config)
    wav_path = out / f'{wid}.wav'
    wav_path.write_bytes(buf.getvalue())
    mp3 = out / f'{wid}.mp3'
    # Mono, 48 kb/s : largement suffisant pour une voix, quelques Ko par mot.
    subprocess.run(
        # 150 ms de silence avant et après : iOS coupe parfois le tout début d'un son.
        ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav_path), '-af', 'adelay=150,apad=pad_dur=0.15', '-ac', '1', '-b:a', '48k', str(mp3)],
        check=True,
    )
    wav_path.unlink()
    print(wid, text, mp3.stat().st_size, 'octets')
