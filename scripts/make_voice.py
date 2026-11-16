"""
Builds the game's voice clips with Microsoft neural voices (edge-tts).

Pure phonics sounds can't be typed into a text-to-speech engine ("sss" is read
as "ess ess ess"), so each sound is cut out of a real spoken word:

    /s/  hiss at the start of "sun"        /t/  burst at the start of "top"
    /a/  vowel of "at" (before the t)      /p/  burst at the start of "pop"
    /i/  vowel of "it" (before the t)      /n/  hum at the start of "net"

Continuous sounds are stretched (pitch preserved) so little ears can hear them,
stop sounds are played twice ("t ... t"), and everything is loudness-matched.

Requires: pip install edge-tts numpy ; ffmpeg on PATH.
Run from the repo root:  python scripts/make_voice.py
"""

import asyncio
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import edge_tts
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
SR = 24000
TEACHER = ("en-GB-SoniaNeural", "-12%", "+0Hz")   # clear sounds & words
MUNCHY = ("en-US-AnaNeural", "+0%", "+0Hz")         # cute cartoon chatter

WORDS = ["snake", "apple", "tiger", "pig", "igloo", "nest"]

LINES = {
    "intro": "Hi! I'm Munchy! I'm so hungry for sounds! Tap the glowing circle to play!",
    "mode_feed": "Feed me the card with my sound!",
    "mode_bubble": "Pop the bubbles with my sound!",
    "mode_egg": "Find the egg with my sound. Then tap, tap, tap!",
    "yummy": "Yummy!",
    "great": "Great listening!",
    "yougotit": "You got it!",
    "oops": "Oops! Try again!",
    "notthat": "Hmm, not that one!",
    "excuse": "Oh! Excuse me!",
    "didit": "You did it!",
    "chest": "Tap the treasure chest!",
    "fancy": "Ooh, fancy!",
    "loveit": "I love it!",
    "letsgo": "Let's go!",
    "superstar": "Wow! You are a sound superstar!",
    "giggle": "Hee hee! That tickles!",
    "locked": "Finish the glowing one first!",
    "newhat": "A new hat for me!",
    "newsticker": "A new sticker!",
}


async def tts(text: str, voice: tuple[str, str, str], path: Path) -> None:
    v, rate, pitch = voice
    await edge_tts.Communicate(text, v, rate=rate, pitch=pitch).save(str(path))


def to_wav(src: Path, dst: Path) -> np.ndarray:
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR), str(dst)], check=True)
    with wave.open(str(dst)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def write_wav(x: np.ndarray, path: Path) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def frames(x: np.ndarray, hop=0.005, win=0.02):
    h, n = int(SR * hop), int(SR * win)
    out = []
    for i in range(0, len(x) - n, h):
        f = x[i:i + n] * np.hanning(n)
        sp = np.abs(np.fft.rfft(f)) ** 2
        fr = np.fft.rfftfreq(n, 1 / SR)
        e = sp.sum() + 1e-12
        out.append({
            "t": i / SR,
            "rms": float(np.sqrt(np.mean(x[i:i + n] ** 2))),
            "low": float(sp[fr < 900].sum() / e),
            "mid": float(sp[(fr > 1000) & (fr < 3000)].sum() / e),
            "cen": float((sp * fr).sum() / e),
        })
    return out


def onset(fs, peak):
    return next(f["t"] for f in fs if f["rms"] > peak * 0.03)


def cut_unvoiced_initial(x):
    """Fricative / aspirated burst at the start of a word, up to voicing."""
    fs = frames(x)
    peak = max(f["rms"] for f in fs)
    t0 = onset(fs, peak)
    # Voicing = the loud vowel arriving (bursts and aspiration are much quieter)
    t1 = next(f["t"] for f in fs if f["t"] > t0 + 0.02 and f["rms"] > peak * 0.3)
    # Stop before the vowel starts so it's a crisp "t", not "tuh"
    return t0, max(t0 + 0.035, t1 - 0.03)


def cut_fricative_initial(x):
    """Hiss at the start of a word: bright noise until the spectrum drops into a vowel."""
    fs = frames(x)
    peak = max(f["rms"] for f in fs)
    t0 = onset(fs, peak)
    t1 = next(f["t"] for f in fs if f["t"] > t0 + 0.02 and f["cen"] < 2500 and f["rms"] > peak * 0.05)
    return t0 + 0.01, t1 - 0.01


def cut_vowel_before_stop(x):
    """Vowel from the start of the word up to the stop closure, minus the glide into it."""
    fs = frames(x)
    peak = max(f["rms"] for f in fs)
    t0 = onset(fs, peak)
    t1 = next(f["t"] for f in fs if f["t"] > t0 + 0.05 and f["rms"] < peak * 0.08)
    return t0 + 0.01, t1 - 0.045


def cut_nasal_initial(x):
    """Nasal murmur: voiced energy with almost nothing between 1-3 kHz."""
    fs = frames(x)
    peak = max(f["rms"] for f in fs)
    t0 = onset(fs, peak)
    t1 = next(f["t"] for f in fs if f["t"] > t0 + 0.03 and f["mid"] > 0.03)
    return t0 + 0.005, t1 - 0.01


def stretch(x: np.ndarray, factor: float, tmp: Path) -> np.ndarray:
    """Pitch-preserving time stretch (factor > 1 makes it longer), corrected for ffmpeg undershoot."""
    target = len(x) * factor
    y = x
    for _ in range(3):
        f = target / len(y)
        if abs(f - 1) < 0.04:
            break
        y = _atempo(y, f, tmp)
    return y


def _atempo(x: np.ndarray, factor: float, tmp: Path) -> np.ndarray:
    src, dst = tmp / "st_in.wav", tmp / "st_out.wav"
    write_wav(x, src)
    tempo = 1 / factor
    chain = []
    while tempo < 0.5:
        chain.append("atempo=0.5")
        tempo /= 0.5
    chain.append(f"atempo={tempo:.4f}")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-af", ",".join(chain), str(dst)], check=True)
    with wave.open(str(dst)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def fade(x: np.ndarray, fin: float, fout: float) -> np.ndarray:
    x = x.copy()
    a, b = int(SR * fin), int(SR * fout)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b) ** 1.5
    return x


def normalise(x: np.ndarray, rms_target: float, peak_cap=0.89) -> np.ndarray:
    active = x[np.abs(x) > 0.002]
    rms = float(np.sqrt(np.mean(active ** 2))) if len(active) else 1
    y = x * (rms_target / max(rms, 1e-6))
    peak = float(np.max(np.abs(y)))
    return y * (peak_cap / peak) if peak > peak_cap else y


def encode(x: np.ndarray, path: Path, tmp: Path) -> None:
    wav = tmp / "enc.wav"
    write_wav(np.concatenate([np.zeros(int(SR * 0.02)), x, np.zeros(int(SR * 0.05))]), wav)
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-q:a", "3", str(path)], check=True)


def trim_silence(x: np.ndarray) -> np.ndarray:
    idx = np.where(np.abs(x) > 0.01)[0]
    if not len(idx):
        return x
    return x[max(0, idx[0] - int(SR * 0.01)): idx[-1] + int(SR * 0.04)]


async def main() -> None:
    report = {}
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        src = {}
        for word in ["sun", "at", "it", "top", "pop", "net"]:
            mp3 = tmp / f"{word}.mp3"
            await tts(f"{word}.", TEACHER, mp3)
            src[word] = to_wav(mp3, tmp / f"{word}.wav")

        def seg(word, fn):
            x = src[word]
            t0, t1 = fn(x)
            report[word] = [round(t0, 3), round(t1, 3)]
            return x[int(t0 * SR): int(t1 * SR)]

        s = seg("sun", cut_fricative_initial)
        s = fade(stretch(s, 0.95 / (len(s) / SR), tmp), 0.06, 0.12)
        a = seg("at", cut_vowel_before_stop)
        a = fade(stretch(a, 0.5 / (len(a) / SR), tmp), 0.015, 0.08)
        i = seg("it", cut_vowel_before_stop)
        i = fade(stretch(i, 0.44 / (len(i) / SR), tmp), 0.015, 0.08)
        n = seg("net", cut_nasal_initial)
        n = fade(stretch(n, 0.85 / (len(n) / SR), tmp), 0.04, 0.12)
        t = fade(seg("top", cut_unvoiced_initial), 0.002, 0.012)
        p = fade(seg("pop", cut_unvoiced_initial), 0.002, 0.012)

        gap = np.zeros(int(SR * 0.38))
        clips = {
            "s": normalise(s, 0.09),
            "a": normalise(a, 0.16),
            "i": normalise(i, 0.16),
            "n": normalise(n, 0.15),
            "t": normalise(np.concatenate([t, gap, t]), 0.12),
            "p": normalise(np.concatenate([p, gap, p]), 0.12),
        }
        for letter, x in clips.items():
            encode(x, OUT / f"{letter}.mp3", tmp)
            report[f"{letter}_dur"] = round(len(x) / SR, 3)

        for w in WORDS:
            mp3 = tmp / f"w_{w}.mp3"
            await tts(f"{w}!", TEACHER, mp3)
            x = normalise(trim_silence(to_wav(mp3, tmp / f"w_{w}.wav")), 0.13)
            encode(x, OUT / "words" / f"{w}.mp3", tmp)
            mp3 = tmp / f"l_{w}.mp3"
            await tts(f"like {w}.", TEACHER, mp3)
            x = normalise(trim_silence(to_wav(mp3, tmp / f"l_{w}.wav")), 0.13)
            encode(x, OUT / "words" / f"like_{w}.mp3", tmp)

        for key, text in LINES.items():
            mp3 = tmp / f"line_{key}.mp3"
            await tts(text, MUNCHY, mp3)
            x = normalise(trim_silence(to_wav(mp3, tmp / f"line_{key}.wav")), 0.13)
            encode(x, OUT / "lines" / f"{key}.mp3", tmp)

    (OUT / "lines" / "manifest.json").write_text(json.dumps(LINES, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
