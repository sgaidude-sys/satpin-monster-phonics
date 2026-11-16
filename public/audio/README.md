# Voice clips

All voice audio is pre-rendered with Microsoft neural voices by
`scripts/make_voice.py` (needs `pip install edge-tts numpy` and ffmpeg):

```
python scripts/make_voice.py
```

- `s.mp3 a.mp3 t.mp3 p.mp3 i.mp3 n.mp3` – the **pure** SATPIN sounds. Text-to-speech
  can't say these directly ("sss" comes out as "ess ess ess"), so each one is cut out
  of a real spoken word: /s/ from *sun*, /a/ from *at*, /t/ from *top*, /p/ from *pop*,
  /i/ from *it*, /n/ from *net*. Long sounds are stretched (pitch kept), short ones are
  played twice ("t … t"), and all are loudness-matched.
- `words/` – keywords (*snake*, *apple*…) and hints (*like snake*), clear British voice.
- `lines/` – Munchy's chatter in a cartoon voice. `lines/manifest.json` lists the text.

To use your own recordings instead, just replace any of these files with an mp3 of
the same name. If a file is missing the game falls back to its built-in synthesiser
and the device's speech voice.
