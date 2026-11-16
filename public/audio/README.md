# Custom Phoneme Recordings (optional)

Munchy synthesises the six pure SATPIN sounds himself (`src/audio/voice.ts`), so the
game works with no audio files at all. For the very best result, drop real recordings
of the **pure sounds** (not letter names) here and they will be used automatically:

- `s.mp3` – /s/ (a long "sssss")
- `a.mp3` – /a/ as in *apple*
- `t.mp3` – /t/ (a crisp "t", no "tuh")
- `p.mp3` – /p/ (a puff "p", no "puh")
- `i.mp3` – /i/ as in *igloo*
- `n.mp3` – /n/ (a hummed "nnnn")

Tips: record in a quiet room, trim silence, keep each clip under ~1 second and
normalise to around -3 dBFS. The game ducks its music while the sound plays.
