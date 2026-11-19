"""
Builds every voice clip for Munchy's Phonics Feast using Kokoro-82M (kokoro-onnx):

  * Teacher voice: `af_heart` — Kokoro's flagship Grade-A warm, crystal-clear
    voice for all 23 pure letter sounds, short blending sounds, and 52+ words.
  * Munchy voice:  custom blended Kokoro embedding
    (0.55 * af_bella + 0.30 * af_sky + 0.15 * am_puck) — warm, playful,
    expressive monster buddy voice for all 24 character lines.

Because pure phonics sounds can't simply be typed as isolated letters into TTS,
each sound is extracted directly from uncompressed 24 kHz Kokoro float32 speech
using neutral /ʌ/ carrier words for stops & glides (eliminating unwanted vowel
colouration) and clean steady-state windows for vowels, fricatives & sonorants:

  hiss_final   s, f: unvoiced final fricative lengthened with natural noise grains
  voiced_fric  v, z: pure final voiced fricative tail (from 'love', 'buzz')
  sonorant     m, n, l: steady nasal/lateral tail after vowel decay
  vowel        a, e, i, o, u: pure steady vowel core before consonant transition
  stop         t, p, k, h: crisp aspirated burst from neutral /ʌ/ carriers
  vstop        b, d, g, j: clean voiced release from neutral /ʌ/ carriers
  glide        r, w, y: clean glide onset from neutral /ʌ/ carriers

Two phoneme sets are written:
  public/audio/{s}.mp3        teaching version (long sounds held, stops said twice)
  public/audio/blend/{s}.mp3  short single version used when blending "c-a-t"

Requires: pip install kokoro-onnx numpy ; ffmpeg on PATH.
Auto-discovers cached HuggingFace `fastrtc/kokoro-onnx` model files, or pass
--model <path> and --voices <path>.

Run from repo root:
  python scripts/make_voice.py            # rebuild everything
  python scripts/make_voice.py sounds     # just the 23 letter sounds
  python scripts/make_voice.py words lines
"""

import argparse
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import kokoro_onnx
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
SR = 24000

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

# sound -> (method, carrier word, teach_param, blend_param)
SOUNDS = {
    "s": ("hiss_final", "hiss.", 0.85, 0.38),
    "f": ("hiss_final", "off.", 0.72, 0.34),
    "v": ("voiced_fric", "love.", 0.56, 0.28),
    "z": ("voiced_fric", "buzz.", 0.64, 0.32),
    "m": ("sonorant", "hum.", 0.62, 0.30),
    "n": ("sonorant", "sun.", 0.62, 0.30),
    "l": ("sonorant", "lull.", 0.56, 0.28),
    "a": ("vowel", "add.", 0.38, 0.22),
    "e": ("vowel", "egg.", 0.38, 0.22),
    "i": ("vowel", "if.", 0.34, 0.20),
    "o": ("vowel", "odd.", 0.38, 0.22),
    "u": ("vowel", "up.", 0.36, 0.22),
    "t": ("stop", "tub.", 0.068, 0.0),
    "p": ("stop", "pup.", 0.068, 0.0),
    "k": ("stop", "cup.", 0.072, 0.0),
    "h": ("stop", "hug.", 0.095, 0.0),
    "b": ("vstop", "but.", 0.115, 0.0),
    "d": ("vstop", "dug.", 0.115, 0.0),
    "g": ("vstop", "gum.", 0.115, 0.0),
    "j": ("vstop", "jug.", 0.145, 0.0),
    "r": ("glide", "rug.", 0.15, 0.0),
    "w": ("glide", "won.", 0.14, 0.0),
    "y": ("glide", "yum.", 0.14, 0.0),
}


def find_kokoro_assets(model_arg: str | None, voices_arg: str | None) -> tuple[Path, Path]:
    if model_arg and voices_arg:
        return Path(model_arg), Path(voices_arg)
    cache_roots = [
        Path.home() / ".cache" / "huggingface" / "hub" / "models--fastrtc--kokoro-onnx" / "snapshots",
        ROOT / "models",
    ]
    for root in cache_roots:
        if not root.exists():
            continue
        onnx = next(root.rglob("*.onnx"), None)
        voices = next(root.rglob("voices*.bin"), None)
        if onnx and voices:
            return onnx, voices
    raise FileNotFoundError(
        "Could not find kokoro-v1.0.onnx and voices-v1.0.bin. "
        "Download fastrtc/kokoro-onnx or pass --model and --voices."
    )


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
            "high": float(sp[fr > 3200].sum() / e),
            "cen": float((sp * fr).sum() / e),
        })
    return out


def peak_of(fs):
    return max(f["rms"] for f in fs)


def onset(fs, pk):
    return next(f["t"] for f in fs if f["rms"] > pk * 0.04)


def offset(fs, pk):
    return next(f["t"] for f in reversed(fs) if f["rms"] > pk * 0.04)


def seg(x: np.ndarray, t0: float, t1: float) -> np.ndarray:
    return x[int(max(0, t0) * SR): int(max(t0 + 0.01, t1) * SR)]


# ---------------- acoustic cutting ----------------

def cut_hiss_final(x: np.ndarray) -> np.ndarray:
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
    return seg(x, t + 0.015, end)


def cut_voiced_fric_final(x: np.ndarray) -> np.ndarray:
    """Strictly isolate the pure final /v/ or /z/ tail well past vowel decay."""
    fs = frames(x)
    pk = peak_of(fs)
    end = offset(fs, pk)
    pk_t = max(fs, key=lambda f: f["rms"])["t"]
    # Wait until RMS drops below 20% of vowel peak so zero preceding vowel remains
    t = next((f["t"] for f in fs if f["t"] > pk_t + 0.12 and f["rms"] < pk * 0.2), end - 0.14)
    start = max(t + 0.03, end - 0.16)
    return seg(x, start, max(start + 0.08, end - 0.015))


def cut_final_sonorant(x: np.ndarray) -> np.ndarray:
    fs = frames(x)
    pk = peak_of(fs)
    end = offset(fs, pk)
    pk_t = max(fs, key=lambda f: f["rms"])["t"]
    t = next((f["t"] for f in fs if f["t"] > pk_t + 0.05 and f["mid"] < 0.09), pk_t + 0.12)
    return seg(x, t + 0.03, max(t + 0.10, end - 0.02))


def cut_pure_vowel(x: np.ndarray) -> np.ndarray:
    fs = frames(x)
    pk = peak_of(fs)
    t0 = onset(fs, pk)
    pk_t = max(fs, key=lambda f: f["rms"])["t"]
    t1 = next((f["t"] for f in fs if f["t"] > pk_t + 0.03 and (f["rms"] < pk * 0.48 or f["cen"] > 2400)), pk_t + 0.15)
    t_end = min(t1 - 0.02, t0 + 0.22)
    return seg(x, t0 + 0.015, max(t0 + 0.08, t_end))


def cut_unvoiced_stop(x: np.ndarray, dur=0.068) -> np.ndarray:
    fs = frames(x)
    pk = peak_of(fs)
    t0 = onset(fs, pk)
    v_start = next((f["t"] for f in fs if f["t"] > t0 + 0.025 and f["rms"] > pk * 0.38 and f["low"] > 0.35), t0 + dur)
    end = min(v_start + 0.008, t0 + dur)
    return seg(x, t0 - 0.003, max(t0 + 0.048, end))


def cut_voiced_stop(x: np.ndarray, keep=0.115) -> np.ndarray:
    fs = frames(x)
    pk = peak_of(fs)
    t0 = onset(fs, pk)
    return seg(x, t0 - 0.003, t0 + keep)


def cut_glide(x: np.ndarray, keep=0.145) -> np.ndarray:
    fs = frames(x)
    pk = peak_of(fs)
    t0 = onset(fs, pk)
    return seg(x, t0, t0 + keep)


# ---------------- shaping & mastering ----------------

def grains(x: np.ndarray, target: float, seed: int) -> np.ndarray:
    n = len(x)
    core = x[int(n * 0.15): int(n * 0.85)] if n > SR * 0.06 else x
    g = int(SR * 0.045)
    if len(core) <= g:
        core = np.tile(core, int(np.ceil((g + 1) / max(1, len(core)))) + 1)
    hop = g // 2
    w = np.hanning(g)
    L = int(SR * target)
    out = np.zeros(L + g, dtype=np.float32)
    rng = np.random.default_rng(seed)
    for start in range(0, L, hop):
        pos = int(rng.integers(0, len(core) - g))
        out[start:start + g] += core[pos:pos + g] * w
    out = out[:L]
    a = min(int(SR * 0.03), n, L)
    ramp = np.linspace(0, 1, a, dtype=np.float32)
    out[:a] = x[:a] * (1 - ramp) + out[:a] * ramp
    return out


def stretch(x: np.ndarray, factor: float, tmp: Path) -> np.ndarray:
    factor = min(factor, 1.75)
    if factor <= 1.04:
        return x
    src, dst = tmp / "st_in.wav", tmp / "st_out.wav"
    write_wav(x, src)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-af", f"atempo={1 / factor:.4f}", str(dst)],
        check=True,
    )
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
        x[:a] *= np.linspace(0, 1, a, dtype=np.float32)
    if b:
        x[-b:] *= np.linspace(1, 0, b, dtype=np.float32) ** 1.5
    return x


def normalise(x: np.ndarray, rms_target: float, peak_cap=0.88) -> np.ndarray:
    active = x[np.abs(x) > 0.002]
    rms = float(np.sqrt(np.mean(active ** 2))) if len(active) else 1
    y = x * (rms_target / max(rms, 1e-6))
    peak = float(np.max(np.abs(y)))
    return y * (peak_cap / peak) if peak > peak_cap else y


def trim_silence(x: np.ndarray) -> np.ndarray:
    idx = np.where(np.abs(x) > 0.008)[0]
    if not len(idx):
        return x
    return x[max(0, idx[0] - int(SR * 0.01)): idx[-1] + int(SR * 0.04)]


def encode(x: np.ndarray, path: Path, tmp: Path, pre=0.015, post=0.045) -> None:
    wav = tmp / "enc.wav"
    padded = np.concatenate([np.zeros(int(SR * pre), dtype=np.float32), x, np.zeros(int(SR * post), dtype=np.float32)])
    write_wav(padded, wav)
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-q:a", "2", str(path)],
        check=True,
    )


def build_sound(sound: str, cx: np.ndarray, tmp: Path, report: dict) -> tuple[np.ndarray, np.ndarray]:
    method, _, p1, p2 = SOUNDS[sound]
    gap = np.zeros(int(SR * 0.34), dtype=np.float32)

    if method == "hiss_final":
        raw = cut_hiss_final(cx)
        teach = fade(grains(raw, p1, 1), 0.04, 0.14)
        blend = fade(grains(raw, p2, 2), 0.02, 0.08)
        rms = 0.095
    elif method == "voiced_fric":
        raw = cut_voiced_fric_final(cx)
        teach = fade(grains(raw, p1, 3), 0.04, 0.14)
        blend = fade(grains(raw, p2, 4), 0.025, 0.08)
        rms = 0.125
    elif method == "sonorant":
        raw = cut_final_sonorant(cx)
        teach = fade(fit(raw, p1, tmp), 0.03, 0.11)
        blend = fade(fit(raw, p2, tmp), 0.02, 0.07)
        rms = 0.15
    elif method == "vowel":
        raw = cut_pure_vowel(cx)
        teach = fade(fit(raw, p1, tmp), 0.02, 0.095)
        blend = fade(fit(raw, p2, tmp), 0.015, 0.06)
        rms = 0.16
    elif method == "stop":
        raw = cut_unvoiced_stop(cx, p1)
        one = fade(raw, 0.002, 0.02)
        teach = np.concatenate([one, gap, one])
        blend = one
        rms = 0.13
    elif method == "vstop":
        raw = cut_voiced_stop(cx, p1)
        one = fade(raw, 0.003, 0.045)
        teach = np.concatenate([one, gap, one])
        blend = one
        rms = 0.14
    else:  # glide
        raw = cut_glide(cx, p1)
        one_teach = fade(fit(raw, p1 * 1.4, tmp), 0.012, 0.065)
        teach = np.concatenate([one_teach, np.zeros(int(SR * 0.3), dtype=np.float32), one_teach])
        blend = fade(raw, 0.01, 0.05)
        rms = 0.14

    report[sound] = {
        "raw": round(len(raw) / SR, 3),
        "teach": round(len(teach) / SR, 3),
        "blend": round(len(blend) / SR, 3),
    }
    return normalise(teach, rms), normalise(blend, rms)


def main() -> None:
    parser = argparse.ArgumentParser(description="Render Munchy's Phonics Feast voice pack with Kokoro-82M.")
    parser.add_argument("parts", nargs="*", help="Optional subset: sounds words lines")
    parser.add_argument("--model", help="Path to kokoro-v1.0.onnx")
    parser.add_argument("--voices", help="Path to voices-v1.0.bin")
    args = parser.parse_args()

    onnx_path, voices_path = find_kokoro_assets(args.model, args.voices)
    print(f"Loading Kokoro-82M from {onnx_path.parent}...", file=sys.stderr)
    kokoro = kokoro_onnx.Kokoro(str(onnx_path), str(voices_path))

    # Flagship clear teacher voice for phonics sounds & words
    teacher_voice = kokoro.get_voice_style("af_heart")
    # Warm, cheerful, playful custom-blended voice for Munchy's spoken lines
    munchy_voice = (
        0.55 * kokoro.get_voice_style("af_bella")
        + 0.30 * kokoro.get_voice_style("af_sky")
        + 0.15 * kokoro.get_voice_style("am_puck")
    ).astype(np.float32)

    only = set(args.parts)
    report: dict = {}

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)

        if not only or "sounds" in only:
            print("Rendering 23 pure letter sounds + blend set...", file=sys.stderr)
            for sound, (_, word, _, _) in SOUNDS.items():
                cx, _ = kokoro.create(word, voice=teacher_voice, speed=0.66)
                teach, blend = build_sound(sound, cx, tmp, report)
                encode(teach, OUT / f"{sound}.mp3", tmp)
                encode(blend, OUT / "blend" / f"{sound}.mp3", tmp, pre=0.01, post=0.02)
            # c shares /k/ with k
            (OUT / "c.mp3").write_bytes((OUT / "k.mp3").read_bytes())
            (OUT / "blend" / "c.mp3").write_bytes((OUT / "blend" / "k.mp3").read_bytes())

        if not only or "words" in only:
            words = sorted(set(KEYWORDS.values()) | set(BLEND_WORDS))
            print(f"Rendering {len(words)} words + {len(KEYWORDS)} hints...", file=sys.stderr)
            for w in words:
                name = w.replace("-", "")
                samples, _ = kokoro.create(f"{w}!", voice=teacher_voice, speed=0.92)
                encode(normalise(trim_silence(samples), 0.14), OUT / "words" / f"{name}.mp3", tmp)
            for w in KEYWORDS.values():
                name = w.replace("-", "")
                samples, _ = kokoro.create(f"like {w}.", voice=teacher_voice, speed=0.92)
                encode(normalise(trim_silence(samples), 0.14), OUT / "words" / f"like_{name}.mp3", tmp)

        if not only or "lines" in only:
            print(f"Rendering {len(LINES)} Munchy character lines...", file=sys.stderr)
            for key, text in LINES.items():
                samples, _ = kokoro.create(text, voice=munchy_voice, speed=1.03)
                encode(normalise(trim_silence(samples), 0.15), OUT / "lines" / f"{key}.mp3", tmp)
            (OUT / "lines" / "manifest.json").write_text(json.dumps(LINES, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
