import {
  ANIMAL_STICKERS,
  SATPIN_LETTERS,
  type AnimalSticker,
  type SatpinLetter,
} from '../data/phonics';

const STORAGE_KEY = 'monster_phonics_satpin_v1';
export const ROUNDS_PER_CELEBRATION = 5;
export const MASTERY_TARGET = 5;

export interface LetterMastery {
  attempts: number;
  correct: number;
  streak: number;
}

export interface ProgressionState {
  mastery: Record<SatpinLetter, LetterMastery>;
  roundProgress: number; // 0..4, reaches 5 to trigger celebration & resets to 0
  totalRoundsWon: number;
  unlockedStickers: string[];
}

function createInitialMastery(): Record<SatpinLetter, LetterMastery> {
  return {
    s: { attempts: 0, correct: 0, streak: 0 },
    a: { attempts: 0, correct: 0, streak: 0 },
    t: { attempts: 0, correct: 0, streak: 0 },
    p: { attempts: 0, correct: 0, streak: 0 },
    i: { attempts: 0, correct: 0, streak: 0 },
    n: { attempts: 0, correct: 0, streak: 0 },
  };
}

export function loadProgression(): ProgressionState {
  const fallback: ProgressionState = {
    mastery: createInitialMastery(),
    roundProgress: 0,
    totalRoundsWon: 0,
    unlockedStickers: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ProgressionState>;
    const mastery = createInitialMastery();
    for (const letter of SATPIN_LETTERS) {
      const m = parsed.mastery?.[letter];
      if (m && typeof m.correct === 'number' && typeof m.attempts === 'number') {
        mastery[letter] = {
          attempts: Math.max(0, m.attempts),
          correct: Math.max(0, m.correct),
          streak: Math.max(0, m.streak ?? 0),
        };
      }
    }
    return {
      mastery,
      roundProgress:
        typeof parsed.roundProgress === 'number'
          ? parsed.roundProgress % ROUNDS_PER_CELEBRATION
          : 0,
      totalRoundsWon:
        typeof parsed.totalRoundsWon === 'number' ? Math.max(0, parsed.totalRoundsWon) : 0,
      unlockedStickers: Array.isArray(parsed.unlockedStickers)
        ? parsed.unlockedStickers.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return fallback;
  }
}

export function resetProgression(): ProgressionState {
  const fresh: ProgressionState = {
    mastery: createInitialMastery(),
    roundProgress: 0,
    totalRoundsWon: 0,
    unlockedStickers: [],
  };
  saveProgression(fresh);
  return fresh;
}

export function saveProgression(state: ProgressionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordAttempt(
  state: ProgressionState,
  letter: SatpinLetter,
  isCorrect: boolean
): {
  nextState: ProgressionState;
  triggeredCelebration: boolean;
  unlockedSticker: AnimalSticker | null;
} {
  const current = state.mastery[letter];
  const updatedLetter: LetterMastery = {
    attempts: current.attempts + 1,
    correct: current.correct + (isCorrect ? 1 : 0),
    streak: isCorrect ? current.streak + 1 : 0,
  };

  const nextMastery = {
    ...state.mastery,
    [letter]: updatedLetter,
  };

  if (!isCorrect) {
    const nextState: ProgressionState = {
      ...state,
      mastery: nextMastery,
    };
    saveProgression(nextState);
    return { nextState, triggeredCelebration: false, unlockedSticker: null };
  }

  const nextRoundCount = state.roundProgress + 1;
  const triggeredCelebration = nextRoundCount >= ROUNDS_PER_CELEBRATION;
  let unlockedSticker: AnimalSticker | null = null;
  let nextStickers = state.unlockedStickers;

  if (triggeredCelebration) {
    const locked = ANIMAL_STICKERS.filter((s) => !state.unlockedStickers.includes(s.id));
    if (locked.length > 0) {
      unlockedSticker = locked[Math.floor(Math.random() * locked.length)];
      nextStickers = [...state.unlockedStickers, unlockedSticker.id];
    } else {
      // All stickers collected — celebrate with a random favorite!
      unlockedSticker = ANIMAL_STICKERS[Math.floor(Math.random() * ANIMAL_STICKERS.length)];
    }
  }

  const nextState: ProgressionState = {
    mastery: nextMastery,
    roundProgress: triggeredCelebration ? 0 : nextRoundCount,
    totalRoundsWon: state.totalRoundsWon + 1,
    unlockedStickers: nextStickers,
  };

  saveProgression(nextState);
  return { nextState, triggeredCelebration, unlockedSticker };
}

export function pickNextTargetLetter(
  state: ProgressionState,
  previousLetter?: SatpinLetter
): SatpinLetter {
  const candidates = SATPIN_LETTERS.filter((l) => l !== previousLetter);
  // Gently weight toward letters with fewer correct answers
  const weighted: SatpinLetter[] = [];
  for (const letter of candidates) {
    const correct = state.mastery[letter].correct;
    const weight = Math.max(1, MASTERY_TARGET + 1 - Math.min(MASTERY_TARGET, correct));
    for (let i = 0; i < weight; i++) {
      weighted.push(letter);
    }
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export function pickRoundChoices(target: SatpinLetter): SatpinLetter[] {
  const others = SATPIN_LETTERS.filter((l) => l !== target);
  // Shuffle others
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const choices = [target, others[0], others[1]];
  // Shuffle final 3 choices
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}
