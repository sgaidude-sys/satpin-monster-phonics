import { LETTER_GROUPS, type Letter } from './phonics';

export type GameMode = 'feed' | 'bubble' | 'egg' | 'blend' | 'build';

export interface LevelDef {
  mode: GameMode;
  /** Letters used (letter games) — blending games use words from `world` and earlier */
  letters: Letter[];
  rounds: number;
  world: number;
}

export interface ModeInfo {
  name: string;
  instruction: string;
  color: string;
  colorDark: string;
  /** mistakes allowed for 3 stars / 2 stars */
  stars: [number, number];
}

export const MODE_INFO: Record<GameMode, ModeInfo> = {
  feed: {
    name: 'Feed Munchy',
    instruction: "Drag or tap the right card into Munchy's mouth!",
    color: '#ff8a3d',
    colorDark: '#c2410c',
    stars: [1, 3],
  },
  bubble: {
    name: 'Bubble Pop',
    instruction: 'Pop 3 bubbles with the sound!',
    color: '#29b6f6',
    colorDark: '#0277bd',
    stars: [2, 5],
  },
  egg: {
    name: 'Egg Hatch',
    instruction: 'Find the egg, then tap it to hatch!',
    color: '#9b6dff',
    colorDark: '#5b3df5',
    stars: [1, 3],
  },
  blend: {
    name: 'Blend It!',
    instruction: 'Listen to the sounds, blend them, and feed Munchy the picture!',
    color: '#2ed47a',
    colorDark: '#15803d',
    stars: [1, 3],
  },
  build: {
    name: 'Word Builder',
    instruction: 'Tap the sounds in order to build the word!',
    color: '#ff5d8f',
    colorDark: '#be185d',
    stars: [2, 4],
  },
};

export interface WorldDef {
  name: string;
  emoji: string;
  color: string;
}

export const WORLDS: WorldDef[] = [
  { name: 'Sunny Meadow', emoji: '🌼', color: '#22c55e' },
  { name: 'Candy Forest', emoji: '🍭', color: '#ec4899' },
  { name: 'Ocean Shore', emoji: '🐚', color: '#0ea5e9' },
  { name: 'Starry Hills', emoji: '⭐', color: '#8b5cf6' },
];

const [G1, G2, G3, G4] = LETTER_GROUPS;
const upTo = (n: number) => LETTER_GROUPS.slice(0, n + 1).flat();

export const LEVELS: LevelDef[] = [
  // World 1 — s a t i p n
  { world: 0, mode: 'feed', letters: ['s', 'a', 't'], rounds: 5 },
  { world: 0, mode: 'bubble', letters: ['s', 'a', 't'], rounds: 3 },
  { world: 0, mode: 'egg', letters: ['i', 'p', 'n'], rounds: 4 },
  { world: 0, mode: 'feed', letters: G1, rounds: 5 },
  { world: 0, mode: 'blend', letters: G1, rounds: 4 },
  { world: 0, mode: 'build', letters: G1, rounds: 4 },
  // World 2 — c k e h r m d
  { world: 1, mode: 'feed', letters: ['c', 'e', 'h', 'k'], rounds: 5 },
  { world: 1, mode: 'egg', letters: ['r', 'm', 'd', 'e'], rounds: 4 },
  { world: 1, mode: 'bubble', letters: G2, rounds: 4 },
  { world: 1, mode: 'blend', letters: upTo(1), rounds: 5 },
  { world: 1, mode: 'feed', letters: upTo(1), rounds: 5 },
  { world: 1, mode: 'build', letters: upTo(1), rounds: 5 },
  // World 3 — g o u l f b
  { world: 2, mode: 'feed', letters: ['g', 'o', 'u'], rounds: 5 },
  { world: 2, mode: 'bubble', letters: ['l', 'f', 'b'], rounds: 4 },
  { world: 2, mode: 'egg', letters: G3, rounds: 5 },
  { world: 2, mode: 'blend', letters: upTo(2), rounds: 5 },
  { world: 2, mode: 'build', letters: upTo(2), rounds: 5 },
  { world: 2, mode: 'bubble', letters: upTo(2), rounds: 4 },
  // World 4 — j z w v y
  { world: 3, mode: 'feed', letters: G4, rounds: 5 },
  { world: 3, mode: 'egg', letters: G4, rounds: 5 },
  { world: 3, mode: 'blend', letters: upTo(3), rounds: 6 },
  { world: 3, mode: 'bubble', letters: upTo(3), rounds: 4 },
  { world: 3, mode: 'build', letters: upTo(3), rounds: 6 },
  { world: 3, mode: 'blend', letters: upTo(3), rounds: 6 },
];

export interface HatDef {
  id: string;
  name: string;
}

export const HATS: HatDef[] = [
  { id: 'party', name: 'Party Hat' },
  { id: 'crown', name: 'Golden Crown' },
  { id: 'shades', name: 'Cool Shades' },
  { id: 'flower', name: 'Pretty Flower' },
  { id: 'wizard', name: 'Wizard Hat' },
  { id: 'pirate', name: 'Pirate Hat' },
  { id: 'bow', name: 'Big Bow' },
  { id: 'chef', name: 'Chef Hat' },
];
