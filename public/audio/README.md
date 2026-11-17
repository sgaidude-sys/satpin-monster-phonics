# Voice clips

All voice audio is pre-rendered with Microsoft's most natural neural voices by
`scripts/make_voice.py` (needs `pip install edge-tts numpy` and ffmpeg):

```
python scripts/make_voice.py            # everything
python scripts/make_voice.py sounds     # just the letter sounds
python scripts/make_voice.py words lines
```

Voices: **Emma** (en-US-EmmaMultilingualNeural) for sounds and words,
**Ava** (en-US-AvaMultilingualNeural) for Munchy's lines.

- `{sound}.mp3` – teaching version of each pure sound (23 letters; `c` and `k` share /k/).
  Long sounds are held, short ones are said twice ("t … t").
- `blend/{sound}.mp3` – short single version used when blending ("c-a-t").
- `words/` – keywords (snake, cat…), blending words (pin, sun, jet…) and hints (like snake).
- `lines/` – Munchy's chatter. `lines/manifest.json` lists the text.

How the pure sounds are made (text-to-speech can't say "sss" — it reads "ess ess ess"):

| kind | letters | source |
| --- | --- | --- |
| hum | m n l | Emma genuinely hums "Mmmmm." — used as-is |
| hiss | s f v z | hiss cut from a slowly spoken word (hiss, off, van, zoo) and lengthened with natural noise grains |
| vowel | a e i o u | cut from the slow word with the longest clean vowel (add, egg, if, odd, uh) |
| burst | t p k h b d g j | the puff at the start of top, pop, kit, hat, bat, dog, got, jam |
| glide | r w y | the start of red, wet, yes |

To use your own recordings, replace any file with an mp3 of the same name.
