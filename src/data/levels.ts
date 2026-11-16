import type { SatpinLetter } from './phonics';

export type GameMode = 'feed' | 'bubble' | 'egg';

export interface LevelDef {
  mode: GameMode;
  letters: SatpinLetter[];
  rounds: number;
}

export interface ModeInfo {
  name: string;
  intro: string;
  instruction: string;
  color: string;
  colorDark: string;
  /** mistakes allowed for 3 stars / 2 stars */
  stars: [number, number];
}

export const MODE_INFO: Record<GameMode, ModeInfo> = {
  feed: {
    name: 'Feed Munchy',
    intro: 'Feed me the card with my sound!',
    instruction: "Drag or tap the right card into Munchy's mouth!",
    color: '#ff8a3d',
    colorDark: '#c2410c',
    stars: [1, 3],
  },
  bubble: {
    name: 'Bubble Pop',
    intro: 'Pop the bubbles with my sound!',
    instruction: 'Pop 3 bubbles with the sound!',
    color: '#29b6f6',
    colorDark: '#0277bd',
    stars: [2, 5],
  },
  egg: {
    name: 'Egg Hatch',
    intro: 'Find the egg with my sound. Then tap, tap, tap!',
    instruction: 'Find the egg, then tap it to hatch!',
    color: '#9b6dff',
    colorDark: '#5b3df5',
    stars: [1, 3],
  },
};

const A: SatpinLetter[] = ['s', 'a', 't'];
const B: SatpinLetter[] = ['p', 'i', 'n'];
const ALL: SatpinLetter[] = ['s', 'a', 't', 'p', 'i', 'n'];

export const LEVELS: LevelDef[] = [
  { mode: 'feed', letters: A, rounds: 5 },
  { mode: 'bubble', letters: A, rounds: 3 },
  { mode: 'egg', letters: A, rounds: 4 },
  { mode: 'feed', letters: B, rounds: 5 },
  { mode: 'bubble', letters: B, rounds: 3 },
  { mode: 'egg', letters: B, rounds: 4 },
  { mode: 'feed', letters: ALL, rounds: 5 },
  { mode: 'bubble', letters: ALL, rounds: 4 },
  { mode: 'egg', letters: ALL, rounds: 5 },
  { mode: 'feed', letters: ALL, rounds: 6 },
  { mode: 'bubble', letters: ALL, rounds: 4 },
  { mode: 'egg', letters: ALL, rounds: 6 },
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
