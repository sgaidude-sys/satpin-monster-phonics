# Voice clips

All voice audio is pre-rendered offline with **Kokoro-82M (`kokoro-onnx`)** by
`scripts/make_voice.py` (needs `pip install kokoro-onnx numpy` and `ffmpeg` on PATH):

```
python scripts/make_voice.py            # everything
python scripts/make_voice.py sounds     # just the 23 letter sounds
python scripts/make_voice.py words lines
```

Voices (Kokoro v1.0, 24 kHz):
- **Teacher (`af_heart`)** — Kokoro's flagship Grade-A warm, crystal-clear voice for all pure phonics sounds, blending sounds, keywords, and hints.
- **Munchy (custom blend: `0.55 * af_bella + 0.30 * af_sky + 0.15 * am_puck`)** — warm, expressive, playful character voice for Munchy's 24 spoken lines.

Files:
- `{sound}.mp3` – teaching version of each pure sound (23 letters; `c` and `k` share `/k/`).
  Long sounds are held, short stops/glides are said twice (`t … t`).
- `blend/{sound}.mp3` – short single version used when blending (`c-a-t`).
- `words/` – keywords (`snake`, `cat`…), blending words (`pin`, `sun`, `jet`…) and hints (`like_snake`).
- `lines/` – Munchy's chatter. `lines/manifest.json` lists the text.

How the pure sounds are extracted directly from uncompressed 24 kHz Kokoro float32 speech:

| kind | letters | source |
| --- | --- | --- |
| hiss_final | s f | unvoiced final fricative (`hiss`, `off`) lengthened with natural noise grains |
| voiced_fric | v z | clean final voiced fricative tail (`love`, `buzz`) |
| sonorant | m n l | steady nasal/lateral tail after vowel decay (`hum`, `sun`, `lull`) |
| vowel | a e i o u | pure steady vowel core before consonant closure (`add`, `egg`, `if`, `odd`, `up`) |
| stop / vstop | t p k h b d g j | crisp burst/release from neutral `/ʌ/` carriers (`tub`, `pup`, `cup`, `hug`, `but`, `dug`, `gum`, `jug`) |
| glide | r w y | clean glide onset from neutral `/ʌ/` carriers (`rug`, `won`, `yum`) |

To use your own recordings, replace any file with an `.mp3` of the same name.
