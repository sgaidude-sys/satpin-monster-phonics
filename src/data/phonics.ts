export type SatpinLetter = 's' | 'a' | 't' | 'p' | 'i' | 'n';

export interface PhonicsItem {
  letter: SatpinLetter;
  word: string;
  /** Phonetic cue used by the speech synthesizer fallback */
  phoneticText: string;
  /** Base frequency (Hz) for the gentle Web Audio fallback tone */
  fallbackToneHz: number;
  /** Tailwind color classes for the bouncy card */
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  letterColor: string;
  accentHex: string;
  svg: string;
}

export interface AnimalSticker {
  id: string;
  name: string;
  emoji: string;
  bgClass: string;
  tagline: string;
}

export const SATPIN_ITEMS: Record<SatpinLetter, PhonicsItem> = {
  s: {
    letter: 's',
    word: 'snake',
    phoneticText: 'sss',
    fallbackToneHz: 523.25, // C5
    cardBg: 'bg-emerald-50 hover:bg-emerald-100',
    cardBorder: 'border-emerald-400',
    cardShadow: 'shadow-[0_8px_0_#10b981]',
    letterColor: 'text-emerald-600',
    accentHex: '#10b981',
    svg: `<svg viewBox="0 0 120 120" class="w-full h-full drop-shadow-sm" aria-hidden="true">
      <path d="M26 88 C18 72, 34 58, 52 64 C70 70, 82 56, 74 40 C66 24, 88 18, 96 34 C102 46, 86 52, 82 44" fill="none" stroke="#10b981" stroke-width="18" stroke-linecap="round"/>
      <path d="M26 88 C18 72, 34 58, 52 64 C70 70, 82 56, 74 40" fill="none" stroke="#34d399" stroke-width="8" stroke-linecap="round" stroke-dasharray="6 10"/>
      <circle cx="90" cy="30" r="14" fill="#059669"/>
      <circle cx="94" cy="26" r="4.5" fill="#ffffff"/>
      <circle cx="95" cy="26" r="2.2" fill="#0f172a"/>
      <circle cx="85" cy="27" r="4" fill="#ffffff"/>
      <circle cx="86" cy="27" r="2" fill="#0f172a"/>
      <path d="M103 33 L113 31 M113 31 L117 28 M113 31 L117 35" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="25" cy="88" r="5" fill="#34d399"/>
    </svg>`,
  },
  a: {
    letter: 'a',
    word: 'apple',
    phoneticText: 'ah',
    fallbackToneHz: 587.33, // D5
    cardBg: 'bg-rose-50 hover:bg-rose-100',
    cardBorder: 'border-rose-400',
    cardShadow: 'shadow-[0_8px_0_#f43f5e]',
    letterColor: 'text-rose-600',
    accentHex: '#f43f5e',
    svg: `<svg viewBox="0 0 120 120" class="w-full h-full drop-shadow-sm" aria-hidden="true">
      <path d="M60 28 C60 16, 68 12, 74 14" fill="none" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
      <path d="M62 24 C74 14, 88 18, 86 28 C78 32, 68 30, 62 24 Z" fill="#22c55e"/>
      <path d="M60 34 C44 26, 22 36, 22 62 C22 88, 42 104, 56 100 C59 99, 61 99, 64 100 C78 104, 98 88, 98 62 C98 36, 76 26, 60 34 Z" fill="#f43f5e"/>
      <ellipse cx="42" cy="52" rx="7" ry="13" transform="rotate(-20 42 52)" fill="#fda4af" opacity="0.7"/>
      <circle cx="48" cy="64" r="3.5" fill="#0f172a"/>
      <circle cx="72" cy="64" r="3.5" fill="#0f172a"/>
      <path d="M53 74 Q60 80 67 74" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  t: {
    letter: 't',
    word: 'tiger',
    phoneticText: 'tuh',
    fallbackToneHz: 659.25, // E5
    cardBg: 'bg-amber-50 hover:bg-amber-100',
    cardBorder: 'border-amber-400',
    cardShadow: 'shadow-[0_8px_0_#f59e0b]',
    letterColor: 'text-amber-600',
    accentHex: '#f59e0b',
    svg: `<svg viewBox="0 0 120 120" class="w-full h-full drop-shadow-sm" aria-hidden="true">
      <circle cx="32" cy="34" r="13" fill="#f97316"/>
      <circle cx="32" cy="34" r="6.5" fill="#fed7aa"/>
      <circle cx="88" cy="34" r="13" fill="#f97316"/>
      <circle cx="88" cy="34" r="6.5" fill="#fed7aa"/>
      <circle cx="60" cy="64" r="36" fill="#fb923c"/>
      <ellipse cx="60" cy="76" rx="18" ry="14" fill="#fff7ed"/>
      <path d="M54 32 L60 44 L66 32" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M28 56 L38 60 M26 66 L36 66" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
      <path d="M92 56 L82 60 M94 66 L84 66" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
      <circle cx="46" cy="58" r="5" fill="#0f172a"/>
      <circle cx="47.5" cy="56.5" r="1.8" fill="#ffffff"/>
      <circle cx="74" cy="58" r="5" fill="#0f172a"/>
      <circle cx="75.5" cy="56.5" r="1.8" fill="#ffffff"/>
      <polygon points="55,69 65,69 60,75" fill="#ec4899"/>
      <path d="M52 79 Q60 85 68 79" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  p: {
    letter: 'p',
    word: 'pig',
    phoneticText: 'puh',
    fallbackToneHz: 698.46, // F5
    cardBg: 'bg-pink-50 hover:bg-pink-100',
    cardBorder: 'border-pink-400',
    cardShadow: 'shadow-[0_8px_0_#ec4899]',
    letterColor: 'text-pink-600',
    accentHex: '#ec4899',
    svg: `<svg viewBox="0 0 120 120" class="w-full h-full drop-shadow-sm" aria-hidden="true">
      <path d="M24 44 C18 22, 38 20, 44 36 Z" fill="#f472b6"/>
      <path d="M96 44 C102 22, 82 20, 76 36 Z" fill="#f472b6"/>
      <circle cx="60" cy="64" r="35" fill="#f9a8d4"/>
      <circle cx="44" cy="54" r="5" fill="#0f172a"/>
      <circle cx="45.5" cy="52.5" r="1.8" fill="#ffffff"/>
      <circle cx="76" cy="54" r="5" fill="#0f172a"/>
      <circle cx="77.5" cy="52.5" r="1.8" fill="#ffffff"/>
      <ellipse cx="60" cy="70" rx="16" ry="12" fill="#f472b6"/>
      <circle cx="54" cy="70" r="3.5" fill="#831843"/>
      <circle cx="66" cy="70" r="3.5" fill="#831843"/>
      <path d="M50 86 Q60 92 70 86" fill="none" stroke="#831843" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  i: {
    letter: 'i',
    word: 'igloo',
    phoneticText: 'ih',
    fallbackToneHz: 783.99, // G5
    cardBg: 'bg-sky-50 hover:bg-sky-100',
    cardBorder: 'border-sky-400',
    cardShadow: 'shadow-[0_8px_0_#0ea5e9]',
    letterColor: 'text-sky-600',
    accentHex: '#0ea5e9',
    svg: `<svg viewBox="0 0 120 120" class="w-full h-full drop-shadow-sm" aria-hidden="true">
      <ellipse cx="60" cy="95" rx="46" ry="10" fill="#bae6fd"/>
      <path d="M20 92 C20 50, 38 30, 60 30 C82 30, 100 50, 100 92 Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="4"/>
      <path d="M25 68 H95 M34 48 H86" stroke="#7dd3fc" stroke-width="3"/>
      <path d="M60 30 V48 M44 48 V68 M76 48 V68 M32 68 V92 M88 68 V92" stroke="#7dd3fc" stroke-width="3"/>
      <path d="M46 92 V74 C46 64, 74 64, 74 74 V92 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/>
      <circle cx="88" cy="24" r="3" fill="#7dd3fc"/>
      <circle cx="28" cy="30" r="2.5" fill="#7dd3fc"/>
    </svg>`,
  },
  n: {
    letter: 'n',
    word: 'nest',
    phoneticText: 'nnn',
    fallbackToneHz: 880.0, // A5
    cardBg: 'bg-violet-50 hover:bg-violet-100',
    cardBorder: 'border-violet-400',
    cardShadow: 'shadow-[0_8px_0_#8b5cf6]',
    letterColor: 'text-violet-600',
    accentHex: '#8b5cf6',
    svg: `<svg viewBox="0 0 120 120" class="w-full h-full drop-shadow-sm" aria-hidden="true">
      <ellipse cx="47" cy="54" rx="11" ry="14" transform="rotate(-12 47 54)" fill="#7dd3fc" stroke="#0284c7" stroke-width="2.5"/>
      <ellipse cx="72" cy="53" rx="11" ry="14" transform="rotate(14 72 53)" fill="#fde047" stroke="#ca8a04" stroke-width="2.5"/>
      <ellipse cx="60" cy="58" rx="11" ry="14" fill="#f9a8d4" stroke="#db2777" stroke-width="2.5"/>
      <path d="M18 64 C18 96, 102 96, 102 64 C84 74, 36 74, 18 64 Z" fill="#b45309"/>
      <path d="M22 68 C40 80, 80 80, 98 68" fill="none" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
      <path d="M26 78 C46 88, 74 88, 94 78" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
      <path d="M34 86 C52 94, 68 94, 86 86" fill="none" stroke="#d97706" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  },
};

export const SATPIN_LETTERS: SatpinLetter[] = ['s', 'a', 't', 'p', 'i', 'n'];

export const ANIMAL_STICKERS: AnimalSticker[] = [
  {
    id: 'lion',
    name: 'Sunny Lion',
    emoji: '🦁',
    bgClass: 'bg-amber-100 border-amber-400',
    tagline: 'Roaring with reading power!',
  },
  {
    id: 'panda',
    name: 'Happy Panda',
    emoji: '🐼',
    bgClass: 'bg-emerald-100 border-emerald-400',
    tagline: 'Bamboozlingly smart!',
  },
  {
    id: 'bunny',
    name: 'Bouncy Bunny',
    emoji: '🐰',
    bgClass: 'bg-pink-100 border-pink-400',
    tagline: 'Hopping through sounds!',
  },
  {
    id: 'koala',
    name: 'Cozy Koala',
    emoji: '🐨',
    bgClass: 'bg-sky-100 border-sky-400',
    tagline: 'Super sound listener!',
  },
  {
    id: 'frog',
    name: 'Springy Frog',
    emoji: '🐸',
    bgClass: 'bg-lime-100 border-lime-400',
    tagline: 'Ribbit-ing phonics star!',
  },
  {
    id: 'unicorn',
    name: 'Magic Unicorn',
    emoji: '🦄',
    bgClass: 'bg-violet-100 border-violet-400',
    tagline: 'Sparkling letter champion!',
  },
  {
    id: 'fox',
    name: 'Clever Fox',
    emoji: '🦊',
    bgClass: 'bg-orange-100 border-orange-400',
    tagline: 'Quick ears, bright eyes!',
  },
  {
    id: 'octopus',
    name: 'Tickly Octopus',
    emoji: '🐙',
    bgClass: 'bg-rose-100 border-rose-400',
    tagline: 'Eight arms for high-fives!',
  },
];
