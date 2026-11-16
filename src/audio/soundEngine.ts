import { SATPIN_ITEMS, type SatpinLetter } from '../data/phonics';

let audioCtx: AudioContext | null = null;
const missingAudioFiles = new Set<string>();
const loadedAudioBuffers = new Map<string, AudioBuffer>();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Unlocks Web Audio API on the user's first pointer/key interaction.
 */
export function unlockAudio(): void {
  getAudioContext();
}

/**
 * Soft, bubbly pop sound for card hover/tap.
 */
export function playPop(pitchMultiplier = 1): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(340 * pitchMultiplier, now);
  osc.frequency.exponentialRampToValueAtTime(680 * pitchMultiplier, now + 0.065);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.09);
}

/**
 * Cheerful ascending major-pentatonic chime for correct matches.
 */
export function playChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, idx) => {
    const start = now + idx * 0.065;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.36);
  });
}

/**
 * Playful cartoon "boing" for wrong-card spit-out bounce (gentle, never harsh).
 */
export function playBoing(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);
  osc.frequency.exponentialRampToValueAtTime(260, now + 0.35);

  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(18, now);
  lfoGain.gain.setValueAtTime(24, now);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

  osc.connect(gain);
  gain.connect(ctx.destination);

  lfo.start(now);
  osc.start(now);
  lfo.stop(now + 0.4);
  osc.stop(now + 0.4);
}

/**
 * Celebratory fanfare played when unlocking a collectible sticker after 5 rounds.
 */
export function playFanfare(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const melody = [
    { freq: 523.25, time: 0.0, dur: 0.14 },
    { freq: 659.25, time: 0.12, dur: 0.14 },
    { freq: 783.99, time: 0.24, dur: 0.14 },
    { freq: 1046.5, time: 0.38, dur: 0.35 },
    { freq: 783.99, time: 0.56, dur: 0.14 },
    { freq: 1046.5, time: 0.72, dur: 0.6 },
  ];

  melody.forEach(({ freq, time, dur }) => {
    const start = now + time;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + dur + 0.03);
  });
}

/**
 * Gentle synthesized fallback tone if neither MP3 nor SpeechSynthesis is available.
 */
function playFallbackTone(letter: SatpinLetter): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const item = SATPIN_ITEMS[letter];
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(item.fallbackToneHz, now);
  osc.frequency.exponentialRampToValueAtTime(item.fallbackToneHz * 1.12, now + 0.18);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}

/**
 * Plays the phonetic sound for a letter.
 * Pre-wired for local `/audio/{letter}.mp3` files with automatic fallback
 * to Web Speech API (`speechSynthesis`) and Web Audio tone synthesis.
 */
export async function playPhoneme(
  letter: SatpinLetter,
  onSpeakingStart?: () => void,
  onSpeakingEnd?: () => void
): Promise<void> {
  const url = `/audio/${letter}.mp3`;
  onSpeakingStart?.();

  // 1. Try cached or local /audio/{letter}.mp3 via Web Audio API
  if (!missingAudioFiles.has(url)) {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        let buffer = loadedAudioBuffers.get(url);
        if (!buffer) {
          const response = await fetch(url);
          const contentType = response.headers.get('content-type') || '';
          // Vite dev server returns text/html (index.html) for missing SPA routes
          if (!response.ok || contentType.includes('text/html')) {
            throw new Error(`Audio file not found: ${url}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          buffer = await ctx.decodeAudioData(arrayBuffer);
          loadedAudioBuffers.set(url, buffer);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
          onSpeakingEnd?.();
        };
        source.start(0);
        return;
      }
    } catch {
      missingAudioFiles.add(url);
    }
  }

  // 2. Fallback to Web Speech API synthesizer
  const item = SATPIN_ITEMS[letter];
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(item.phoneticText);
      utterance.rate = 0.85;
      utterance.pitch = 1.25;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang.startsWith('en') && /natural|google|samantha|zira|aria/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      let finished = false;
      const done = () => {
        if (!finished) {
          finished = true;
          onSpeakingEnd?.();
        }
      };

      utterance.onend = done;
      utterance.onerror = () => {
        playFallbackTone(letter);
        setTimeout(done, 320);
      };

      // Safety timeout in case speechSynthesis hangs on some browsers
      setTimeout(done, 1100);
      window.speechSynthesis.speak(utterance);
      return;
    } catch {
      // Fall through to Web Audio tone
    }
  }

  // 3. Final fallback: gentle Web Audio tone
  playFallbackTone(letter);
  setTimeout(() => {
    onSpeakingEnd?.();
  }, 320);
}
