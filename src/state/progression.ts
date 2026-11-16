import { ANIMAL_STICKERS, SATPIN_LETTERS, type AnimalSticker, type SatpinLetter } from '../data/phonics';
import { HATS, LEVELS, type HatDef } from '../data/levels';

const STORAGE_KEY = 'munchy_phonics_v2';
const LEGACY_KEY = 'monster_phonics_satpin_v1';
export const MASTERY_TARGET = 5;

export interface LetterMastery {
  attempts: number;
  correct: number;
  streak: number;
}

export interface ProgressionState {
  mastery: Record<SatpinLetter, LetterMastery>;
  /** Best stars (0-3) per level; 0 = not finished yet */
  levelStars: number[];
  /** Highest level index the player may enter */
  unlockedLevel: number;
  stickers: string[];
  hats: string[];
  equippedHat: string | null;
  prizesGiven: number;
  totalCorrect: number;
  metMunchy: boolean;
}

export type Prize = { kind: 'hat'; hat: HatDef } | { kind: 'sticker'; sticker: AnimalSticker };

function freshMastery(): Record<SatpinLetter, LetterMastery> {
  const m = {} as Record<SatpinLetter, LetterMastery>;
  for (const l of SATPIN_LETTERS) m[l] = { attempts: 0, correct: 0, streak: 0 };
  return m;
}

function fresh(): ProgressionState {
  return {
    mastery: freshMastery(),
    levelStars: LEVELS.map(() => 0),
    unlockedLevel: 0,
    stickers: [],
    hats: [],
    equippedHat: null,
    prizesGiven: 0,
    totalCorrect: 0,
    metMunchy: false,
  };
}

function readMastery(src: unknown): Record<SatpinLetter, LetterMastery> {
  const mastery = freshMastery();
  const obj = (src ?? {}) as Record<string, Partial<LetterMastery>>;
  for (const l of SATPIN_LETTERS) {
    const m = obj[l];
    if (m && typeof m.correct === 'number' && typeof m.attempts === 'number') {
      mastery[l] = { attempts: Math.max(0, m.attempts), correct: Math.max(0, m.correct), streak: Math.max(0, m.streak ?? 0) };
    }
  }
  return mastery;
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function loadProgression(): ProgressionState {
  const base = fresh();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ProgressionState>;
      const stars = Array.isArray(p.levelStars) ? p.levelStars : [];
      return {
        mastery: readMastery(p.mastery),
        levelStars: LEVELS.map((_, i) => Math.max(0, Math.min(3, Number(stars[i]) || 0))),
        unlockedLevel: Math.max(0, Math.min(LEVELS.length - 1, Number(p.unlockedLevel) || 0)),
        stickers: strings(p.stickers).filter((id) => ANIMAL_STICKERS.some((s) => s.id === id)),
        hats: strings(p.hats).filter((id) => HATS.some((h) => h.id === id)),
        equippedHat: typeof p.equippedHat === 'string' ? p.equippedHat : null,
        prizesGiven: Math.max(0, Number(p.prizesGiven) || 0),
        totalCorrect: Math.max(0, Number(p.totalCorrect) || 0),
        metMunchy: !!p.metMunchy,
      };
    }
    // Carry over letter progress and stickers from the first version
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const p = JSON.parse(legacy) as { mastery?: unknown; unlockedStickers?: unknown };
      base.mastery = readMastery(p.mastery);
      base.stickers = strings(p.unlockedStickers);
    }
  } catch {
    /* fall through */
  }
  return base;
}

export function saveProgression(state: ProgressionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export function resetProgression(): ProgressionState {
  const s = fresh();
  s.metMunchy = true;
  saveProgression(s);
  return s;
}

export function update(state: ProgressionState, patch: Partial<ProgressionState>): ProgressionState {
  const next = { ...state, ...patch };
  saveProgression(next);
  return next;
}

export function recordAttempt(state: ProgressionState, letter: SatpinLetter, correct: boolean): ProgressionState {
  const cur = state.mastery[letter];
  return update(state, {
    mastery: {
      ...state.mastery,
      [letter]: {
        attempts: cur.attempts + 1,
        correct: cur.correct + (correct ? 1 : 0),
        streak: correct ? cur.streak + 1 : 0,
      },
    },
    totalCorrect: state.totalCorrect + (correct ? 1 : 0),
  });
}

export function completeLevel(
  state: ProgressionState,
  index: number,
  stars: number
): { state: ProgressionState; prize: Prize | null; unlockedNew: boolean } {
  const levelStars = [...state.levelStars];
  levelStars[index] = Math.max(levelStars[index], stars);
  const nextUnlocked = Math.min(LEVELS.length - 1, Math.max(state.unlockedLevel, index + 1));
  const unlockedNew = nextUnlocked > state.unlockedLevel;

  const lockedHats = HATS.filter((h) => !state.hats.includes(h.id));
  const lockedStickers = ANIMAL_STICKERS.filter((s) => !state.stickers.includes(s.id));
  let prize: Prize | null = null;
  const wantHat = state.prizesGiven % 2 === 0;
  if ((wantHat && lockedHats.length) || (!lockedStickers.length && lockedHats.length)) {
    prize = { kind: 'hat', hat: lockedHats[0] };
  } else if (lockedStickers.length) {
    prize = { kind: 'sticker', sticker: lockedStickers[Math.floor(Math.random() * lockedStickers.length)] };
  }

  const next = update(state, {
    levelStars,
    unlockedLevel: nextUnlocked,
    hats: prize?.kind === 'hat' ? [...state.hats, prize.hat.id] : state.hats,
    stickers: prize?.kind === 'sticker' ? [...state.stickers, prize.sticker.id] : state.stickers,
    prizesGiven: state.prizesGiven + (prize ? 1 : 0),
  });
  return { state: next, prize, unlockedNew };
}

export function totalStars(state: ProgressionState): number {
  return state.levelStars.reduce((a, b) => a + b, 0);
}

/** Picks the next sound, gently favouring letters the child knows least. */
export function pickTarget(state: ProgressionState, letters: SatpinLetter[], previous?: SatpinLetter): SatpinLetter {
  const pool = letters.length > 1 ? letters.filter((l) => l !== previous) : letters;
  const weighted: SatpinLetter[] = [];
  for (const l of pool) {
    const w = Math.max(1, MASTERY_TARGET + 1 - Math.min(MASTERY_TARGET, state.mastery[l].correct));
    for (let i = 0; i < w; i++) weighted.push(l);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickChoices(target: SatpinLetter, letters: SatpinLetter[], count = 3): SatpinLetter[] {
  let others = shuffle(letters.filter((l) => l !== target));
  if (others.length < count - 1) {
    others = [...others, ...shuffle(SATPIN_LETTERS.filter((l) => l !== target && !others.includes(l)))];
  }
  return shuffle([target, ...others.slice(0, count - 1)]);
}
