# Custom Phoneme Audio Files

Drop recorded `.mp3` files for each SATPIN letter here to override the built-in speech/tone synthesizer:

- `s.mp3`
- `a.mp3`
- `t.mp3`
- `p.mp3`
- `i.mp3`
- `n.mp3`

`playPhoneme(letter)` in `src/audio/soundEngine.ts` automatically loads `/audio/{letter}.mp3` when present and falls back to Web Speech API / Web Audio synthesis otherwise.
