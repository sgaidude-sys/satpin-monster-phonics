"""
Builds every voice clip for the game with Microsoft's most natural neural voices
(edge-tts "Copilot" voices):

  * Emma  (en-US-EmmaMultilingualNeural) — clear teacher voice for sounds & words
  * Ava   (en-US-AvaMultilingualNeural)  — warm, expressive voice for Munchy's lines

Pure phonics sounds can't simply be typed into text-to-speech ("sss" is read as
"ess ess ess"), so each sound comes from the most natural source available:

  hum      Emma genuinely hums "Mmmmm." / "Nnnnnn." / "Lllll." — used as-is
  hiss     s f v z: the hiss is cut from a slowly spoken word and lengthened with
           natural noise grains (no robotic time-stretch)
  vowel    a e i o u: cut from a slow word before the stop closure ("at", "egg"...),
           only gently stretched
  burst    t p k h: the puff before the vowel; b d g j get a tiny bit of vowel so they
           are audible
  glide    r w y: the start of the word

Two sets are written:
  public/audio/{s}.mp3        teaching version (long sounds held, stops said twice)
  public/audio/blend/{s}.mp3  short single version used when blending "c-a-t"

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
EMMA = "en-US-EmmaMultilingualNeural"
AVA = "en-US-AvaMultilingualNeural"

KEYWORDS = {
    "s": "snake", "a": "apple", "t": "tiger", "i": "igloo", "p": "pig", "n": "nest",
    "c": "cat", "k": "kite", "e": "egg", "h": "hat", "r": "rabbit", "m": "moon", "d": "dog",
    "g": "goat", "o": "octopus", "u": "umbrella", "l": "leaf", "f": "fish", "b": "ball",
    "j": "jam", "z": "zebra", "w": "web", "v": "van", "y": "yo-yo",
}

BLEND_WORDS = [
    "pin", "pan", "tap", "tin", "ant",
    "cat", "hat", "rat", "map", "pen", "hen", "net",
    "dog", "sun", "bus", "cup", "bug", "bag", "bed", "fan", "log", "mop", "pot",
    "jam", "web", "van", "jug", "zip", "jet",
]

LINES = {
    "intro": "Hi! I'm Munchy! I'm so hungry for sounds! Tap the glowing circle to play!",
    "mode_feed": "Feed me the card with my sound!",
    "mode_bubble": "Pop the bubbles with my sound!",
    "mode_egg": "Find the egg with my sound. Then tap, tap, tap!",
    "mode_blend": "Listen to my sounds. Blend them together, and feed me the picture!",
    "mode_build": "Let's build a word! Tap the sounds in order.",
    "yummy": "Yummy!",
    "great": "Great listening!",
    "yougotit": "You got it!",
    "welldone": "Well done! You read it!",
    "blendit": "Blend it!",
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

# sound -> (method, source text, teaching length s, blend length s)
SOUNDS = {
    "s": ("hiss_final", "hiss.", 0.9, 0.42),
    "f": ("hiss_final", "off.", 0.75, 0.36),
    "v": ("hiss_initial", "van.", 0.6, 0.3),
    "z": ("hiss_initial", "zoo.", 0.65, 0.32),
    "m": ("hum", "Mmmmm.", 0.7, 0.34),
    "n": ("hum", "Nnnnnn.", 0.7, 0.34),
    "l": ("hum", "Lllll.", 0.6, 0.3),
    "a": ("vowel", "add.|at.|ash.", 0.42, 0.24),
    "e": ("vowel", "egg.|Ed.|edge.", 0.4, 0.22),
    "i": ("vowel", "is.|if.|it.|itch.", 0.36, 0.2),
    "o": ("vowel", "odd.|ox.|off.", 0.42, 0.24),
    "u": ("vowel", "up.|us.|uh.", 0.38, 0.22),
    "t": ("burst", "top.", 0, 0),
    "p": ("burst", "pop.", 0, 0),
    "k": ("burst", "kit.", 0, 0),
    "h": ("burst", "hat.", 0, 0),
    "b": ("voiced_burst", "bat.", 0, 0),
    "d": ("voiced_burst", "dog.", 0, 0),
    "g": ("voiced_burst", "got.", 0, 0),
    "j": ("affricate", "jam.", 0, 0),
    "r": ("glide", "red.", 0.32, 0.2),
    "w": ("glide", "wet.", 0.28, 0.18),
    "y": ("glide", "yes.", 0.26, 0.16),
}


async def tts(text: str, voice: str, rate: str, path: Path) -> None:
    await edge_tts.Communicate(text, voice, rate=rate).save(str(path))


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
    fr = np.fft.rfftfreq(n, 1 / SR)
    out = []
    for i in range(0, len(x) - n, h):
        sp = np.abs(np.fft.rfft(x[i:i + n] * np.hanning(n))) ** 2
        e = sp.sum() + 1e-12
        out.append({
            "t": i / SR,
            "rms": float(np.sqrt(np.mean(x[i:i + n] ** 2))),
            "low": float(sp[fr < 500].sum() / e),
            "mid": float(sp[(fr > 1000) & (fr < 3000)].sum() / e),
            "cen": float((sp * fr).sum() / e),
        })
    return out


def peak_of(fs):
    return max(f["rms"] for f in fs)


def onset(fs, peak):
    return next(f["t"] for f in fs if f["rms"] > peak * 0.04)


def offset(fs, peak):
    return next(f["t"] for f in reversed(fs) if f["rms"] > peak * 0.04)


def seg(x, t0, t1):
    return x[int(max(0, t0) * SR): int(t1 * SR)]


# ---------------- cutting ----------------

def cut_hiss_final(x):
    """Fricative at the end of a word: from where the spectrum turns bright to the end."""
    fs = frames(x)
    pk = peak_of(fs)
    end = offset(fs, pk)
    t = end
    for f in reversed(fs):
        if f["t"] > end:
            continue
        if f["cen"] > 2600:
            t = f["t"]
        elif f["t"] < end - 0.02:
            break
    return seg(x, t + 0.01, end)


def cut_hiss_initial(x):
    """Fricative at the start of a word, up to the vowel."""
    fs = frames(x)
    pk = peak_of(fs)
    t0 = onset(fs, pk)
    t1 = next((f["t"] for f in fs if f["t"] > t0 + 0.03 and f["cen"] < 2000 and f["rms"] > pk * 0.15), t0 + 0.12)
    return seg(x, t0 + 0.005, t1 - 0.01)


def cut_hum(x):
    """Longest run of pure nasal/lateral hum (voiced, almost nothing at 1-3 kHz)."""
    fs = frames(x)
    pk = peak_of(fs)
    best, cur = (0, 0), None
    for i, f in enumerate(fs):
        ok = f["rms"] > pk * 0.12 and f["mid"] < 0.04
        if ok and cur is None:
            cur = i
        if (not ok or i == len(fs) - 1) and cur is not None:
            if i - cur > best[1] - best[0]:
                best = (cur, i)
            cur = None
    return seg(x, fs[best[0]]["t"] + 0.02, fs[best[1]]["t"] - 0.02)


def cut_vowel(x):
    """Vowel from the start of the word until it fades or turns into a hiss, minus the glide out."""
    fs = frames(x)
    pk = peak_of(fs)
    t0 = onset(fs, pk)
    t1 = next((f["t"] for f in fs if f["t"] > t0 + 0.04 and (f["rms"] < pk * 0.25 or f["cen"] > 2800)), t0 + 0.25)
    return seg(x, t0 + 0.012, max(t0 + 0.04, t1 - 0.03))


def cut_burst(x, keep_vowel=0.0):
    """Puff/burst before the loud vowel arrives (plus a sliver of vowel for voiced stops)."""
    fs = frames(x)
    pk = peak_of(fs)
    t0 = onset(fs, pk)
    t1 = next((f["t"] for f in fs if f["t"] > t0 + 0.015 and f["rms"] > pk * 0.3), t0 + 0.06)
    end = (t1 + keep_vowel) if keep_vowel else max(t0 + 0.035, t1 - 0.025)
    return seg(x, t0 - 0.003, end)


def cut_affricate(x):
    fs = frames(x)
    pk = peak_of(fs)
    t0 = onset(fs, pk)
    t1 = next((f["t"] for f in fs if f["t"] > t0 + 0.03 and f["cen"] < 2200 and f["rms"] > pk * 0.3), t0 + 0.1)
    return seg(x, t0 - 0.003, t1 + 0.03)


def cut_glide(x, length):
    fs = frames(x)
    pk = peak_of(fs)
    t0 = onset(fs, pk)
    return seg(x, t0, t0 + length)


# ---------------- shaping ----------------

def grains(x: np.ndarray, target: float, seed: int) -> np.ndarray:
    """Lengthen a noisy sound with overlapping random grains — keeps it natural, never robotic."""
    n = len(x)
    core = x[int(n * 0.15): int(n * 0.85)] if n > SR * 0.06 else x
    g = int(SR * 0.045)
    if len(core) <= g:
        core = np.tile(core, int(np.ceil((g + 1) / max(1, len(core)))) + 1)
    hop = g // 2
    w = np.hanning(g)
    L = int(SR * target)
    out = np.zeros(L + g)
    rng = np.random.default_rng(seed)
    for start in range(0, L, hop):
        pos = int(rng.integers(0, len(core) - g))
        out[start:start + g] += core[pos:pos + g] * w
    out = out[:L]
    # Keep the real attack of the original sound
    a = min(int(SR * 0.03), n, L)
    ramp = np.linspace(0, 1, a)
    out[:a] = x[:a] * (1 - ramp) + out[:a] * ramp
    return out


def stretch(x: np.ndarray, factor: float, tmp: Path) -> np.ndarray:
    """Gentle pitch-preserving stretch (capped so it never sounds robotic)."""
    factor = min(factor, 1.8)
    if factor <= 1.04:
        return x
    src, dst = tmp / "st_in.wav", tmp / "st_out.wav"
    write_wav(x, src)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-af", f"atempo={1 / factor:.4f}", str(dst)], check=True)
    with wave.open(str(dst)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def fit(x: np.ndarray, target: float, tmp: Path) -> np.ndarray:
    cur = len(x) / SR
    if cur >= target:
        return x[: int(target * SR)]
    return stretch(x, target / cur, tmp)


def fade(x: np.ndarray, fin: float, fout: float) -> np.ndarray:
    x = x.copy()
    a, b = min(len(x), int(SR * fin)), min(len(x), int(SR * fout))
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


def encode(x: np.ndarray, path: Path, tmp: Path, pre=0.02, post=0.05) -> None:
    wav = tmp / "enc.wav"
    write_wav(np.concatenate([np.zeros(int(SR * pre)), x, np.zeros(int(SR * post))]), wav)
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-q:a", "2", str(path)], check=True)


def trim_silence(x: np.ndarray) -> np.ndarray:
    idx = np.where(np.abs(x) > 0.01)[0]
    if not len(idx):
        return x
    return x[max(0, idx[0] - int(SR * 0.01)): idx[-1] + int(SR * 0.05)]


def make_sound(sound: str, x: np.ndarray, tmp: Path, report: dict) -> tuple[np.ndarray, np.ndarray]:
    method, _, teach_len, blend_len = SOUNDS[sound]
    gap = np.zeros(int(SR * 0.36))
    if method in ("hiss_final", "hiss_initial"):
        raw = cut_hiss_final(x) if method == "hiss_final" else cut_hiss_initial(x)
        teach = fade(grains(raw, teach_len, 1), 0.04, 0.14)
        blend = fade(grains(raw, blend_len, 2), 0.02, 0.08)
        rms = 0.09
    elif method == "hum":
        raw = cut_hum(x)
        teach = fade(fit(raw, teach_len, tmp), 0.04, 0.12)
        blend = fade(raw[: int(blend_len * SR)], 0.02, 0.07)
        rms = 0.15
    elif method == "vowel":
        raw = cut_vowel(x)
        teach = fade(fit(raw, teach_len, tmp), 0.015, 0.09)
        blend = fade(fit(raw, blend_len, tmp), 0.01, 0.06)
        rms = 0.16
    elif method in ("burst", "voiced_burst", "affricate"):
        if method == "burst":
            raw = cut_burst(x)
        elif method == "voiced_burst":
            raw = cut_burst(x, keep_vowel=0.035)
        else:
            raw = cut_affricate(x)
        one = fade(raw, 0.002, 0.015)
        teach = np.concatenate([one, gap, one])
        blend = one
        rms = 0.12
    else:  # glide
        raw = cut_glide(x, 0.11)
        teach = fade(fit(raw, teach_len, tmp), 0.01, 0.07)
        blend = fade(fit(raw, blend_len, tmp), 0.01, 0.05)
        rms = 0.14
    # Very short sounds are easier to hear said twice: "i ... i"
    if method in ("vowel", "glide") and len(teach) / SR < 0.3:
        teach = np.concatenate([teach, np.zeros(int(SR * 0.3)), teach])
    report[sound] = {"raw": round(len(raw) / SR, 3), "teach": round(len(teach) / SR, 3), "blend": round(len(blend) / SR, 3)}
    return normalise(teach, rms), normalise(blend, rms)


async def main() -> None:
    report: dict = {}
    only = set(sys.argv[1:])  # optional: build just some parts, e.g. "sounds"
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)

        if not only or "sounds" in only:
            for sound, (method, text, _, _) in SOUNDS.items():
                # Several candidate words: keep the one that yields the longest clean sound
                best = None
                for k, cand in enumerate(text.split("|")):
                    mp3 = tmp / f"src_{sound}_{k}.mp3"
                    await tts(cand, EMMA, "-40%", mp3)
                    cx = to_wav(mp3, tmp / f"src_{sound}_{k}.wav")
                    length = len(cut_vowel(cx)) if method == "vowel" else len(cx)
                    if best is None or length > best[0]:
                        best = (length, cx, cand)
                x = best[1]
                text = best[2]
                print(f"  {sound}: {text}", file=sys.stderr)
                teach, blend = make_sound(sound, x, tmp, report)
                encode(teach, OUT / f"{sound}.mp3", tmp)
                encode(blend, OUT / "blend" / f"{sound}.mp3", tmp, pre=0.01, post=0.02)
            # c makes the same sound as k
            (OUT / "c.mp3").write_bytes((OUT / "k.mp3").read_bytes())
            (OUT / "blend" / "c.mp3").write_bytes((OUT / "blend" / "k.mp3").read_bytes())

        if not only or "words" in only:
            words = sorted(set(KEYWORDS.values()) | set(BLEND_WORDS))
            for w in words:
                name = w.replace("-", "")
                mp3 = tmp / f"w_{name}.mp3"
                await tts(f"{w}!", EMMA, "-10%", mp3)
                encode(normalise(trim_silence(to_wav(mp3, tmp / f"w_{name}.wav")), 0.13), OUT / "words" / f"{name}.mp3", tmp)
            for w in KEYWORDS.values():
                name = w.replace("-", "")
                mp3 = tmp / f"l_{name}.mp3"
                await tts(f"like {w}.", EMMA, "-10%", mp3)
                encode(normalise(trim_silence(to_wav(mp3, tmp / f"l_{name}.wav")), 0.13), OUT / "words" / f"like_{name}.mp3", tmp)

        if not only or "lines" in only:
            for key, text in LINES.items():
                mp3 = tmp / f"line_{key}.mp3"
                await tts(text, AVA, "-4%", mp3)
                encode(normalise(trim_silence(to_wav(mp3, tmp / f"line_{key}.wav")), 0.13), OUT / "lines" / f"{key}.mp3", tmp)
            (OUT / "lines" / "manifest.json").write_text(json.dumps(LINES, indent=2))

    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
