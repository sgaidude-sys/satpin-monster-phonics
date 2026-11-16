export type SatpinLetter = 's' | 'a' | 't' | 'p' | 'i' | 'n';

export interface PhonicsItem {
  letter: SatpinLetter;
  word: string;
  /** Main accent colour for the card */
  accent: string;
  /** Darker accent used for the 3D card lip and letter shadow */
  accentDark: string;
  /** Pale tint used for the card face */
  tint: string;
  /** Hand-drawn sticker-style illustration */
  svg: string;
}

export interface AnimalSticker {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  ring: string;
  tagline: string;
}

const OUT = '#26213f'; // shared ink outline colour for the illustration set

export const SATPIN_ITEMS: Record<SatpinLetter, PhonicsItem> = {
  s: {
    letter: 's',
    word: 'snake',
    accent: '#22c55e',
    accentDark: '#15803d',
    tint: '#ecfdf3',
    svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="40" ry="7" fill="${OUT}" opacity=".12"/>
      <path d="M20 96 C6 84 22 64 46 70 C70 76 90 72 86 54 C82 38 62 42 62 30" fill="none" stroke="${OUT}" stroke-width="27" stroke-linecap="round"/>
      <path d="M20 96 C6 84 22 64 46 70 C70 76 90 72 86 54 C82 38 62 42 62 30" fill="none" stroke="#4ade80" stroke-width="19" stroke-linecap="round"/>
      <path d="M22 92 C14 82 26 70 46 74 C70 80 92 74 88 54" fill="none" stroke="#fde68a" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 9"/>
      <path d="M30 70 C40 66 52 70 60 72" fill="none" stroke="#bbf7d0" stroke-width="4" stroke-linecap="round" opacity=".9"/>
      <path d="M68 28 L80 30 M80 30 L86 25 M80 30 L86 35" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" transform="translate(8 -2)"/>
      <ellipse cx="66" cy="28" rx="19" ry="16" fill="#4ade80" stroke="${OUT}" stroke-width="4"/>
      <ellipse cx="60" cy="22" rx="8" ry="4" fill="#bbf7d0" opacity=".9"/>
      <circle cx="60" cy="27" r="6" fill="#fff" stroke="${OUT}" stroke-width="2.5"/>
      <circle cx="74" cy="27" r="6" fill="#fff" stroke="${OUT}" stroke-width="2.5"/>
      <circle cx="61.5" cy="27.5" r="3" fill="${OUT}"/>
      <circle cx="75.5" cy="27.5" r="3" fill="${OUT}"/>
      <circle cx="62.5" cy="26" r="1.1" fill="#fff"/>
      <circle cx="76.5" cy="26" r="1.1" fill="#fff"/>
      <path d="M62 36 Q67 40 72 36" fill="none" stroke="${OUT}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="55" cy="34" r="3" fill="#fb7185" opacity=".55"/>
      <circle cx="80" cy="34" r="3" fill="#fb7185" opacity=".55"/>
    </svg>`,
  },
  a: {
    letter: 'a',
    word: 'apple',
    accent: '#f43f5e',
    accentDark: '#be123c',
    tint: '#fff1f3',
    svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="106" rx="36" ry="6" fill="${OUT}" opacity=".12"/>
      <path d="M60 32 C58 22 62 14 70 10" fill="none" stroke="${OUT}" stroke-width="9" stroke-linecap="round"/>
      <path d="M60 32 C58 22 62 14 70 10" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
      <path d="M64 26 C70 12 90 10 96 20 C88 32 72 34 64 26 Z" fill="#4ade80" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M68 25 C76 20 84 18 92 20" fill="none" stroke="#166534" stroke-width="2" stroke-linecap="round"/>
      <path d="M60 36 C44 26 18 34 18 62 C18 90 40 108 56 102 C58 101 62 101 64 102 C80 108 102 90 102 62 C102 34 76 26 60 36 Z" fill="#f43f5e" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M86 46 C96 58 94 82 80 94 C90 80 92 62 86 46 Z" fill="#be123c" opacity=".45"/>
      <ellipse cx="38" cy="54" rx="7" ry="13" transform="rotate(-25 38 54)" fill="#fff" opacity=".55"/>
      <circle cx="35" cy="72" r="2.6" fill="#fff" opacity=".5"/>
      <circle cx="49" cy="66" r="4.2" fill="${OUT}"/>
      <circle cx="71" cy="66" r="4.2" fill="${OUT}"/>
      <circle cx="50.3" cy="64.6" r="1.4" fill="#fff"/>
      <circle cx="72.3" cy="64.6" r="1.4" fill="#fff"/>
      <path d="M53 76 Q60 83 67 76" fill="#7f1d1d" stroke="${OUT}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="42" cy="75" r="4" fill="#fecdd3" opacity=".8"/>
      <circle cx="78" cy="75" r="4" fill="#fecdd3" opacity=".8"/>
    </svg>`,
  },
  t: {
    letter: 't',
    word: 'tiger',
    accent: '#f59e0b',
    accentDark: '#b45309',
    tint: '#fffbeb',
    svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="106" rx="38" ry="6" fill="${OUT}" opacity=".12"/>
      <circle cx="30" cy="34" r="14" fill="#fb923c" stroke="${OUT}" stroke-width="4"/>
      <circle cx="30" cy="34" r="6.5" fill="#fecdd3"/>
      <circle cx="90" cy="34" r="14" fill="#fb923c" stroke="${OUT}" stroke-width="4"/>
      <circle cx="90" cy="34" r="6.5" fill="#fecdd3"/>
      <path d="M60 26 C88 26 100 46 100 66 C100 90 82 102 60 102 C38 102 20 90 20 66 C20 46 32 26 60 26 Z" fill="#fb923c" stroke="${OUT}" stroke-width="4"/>
      <path d="M50 27 L54 40 L58 28 M62 28 L66 40 L70 27" fill="${OUT}" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M21 58 L34 62 L22 66 M20 72 L32 72" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M99 58 L86 62 L98 66 M100 72 L88 72" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="44" cy="40" rx="8" ry="4" fill="#fed7aa" opacity=".8"/>
      <path d="M38 80 C38 68 50 66 60 70 C70 66 82 68 82 80 C82 94 70 98 60 98 C50 98 38 94 38 80 Z" fill="#fff7ed" stroke="${OUT}" stroke-width="3"/>
      <circle cx="46" cy="58" r="5.4" fill="${OUT}"/>
      <circle cx="74" cy="58" r="5.4" fill="${OUT}"/>
      <circle cx="47.8" cy="56.2" r="1.9" fill="#fff"/>
      <circle cx="75.8" cy="56.2" r="1.9" fill="#fff"/>
      <path d="M54 72 L66 72 L60 79 Z" fill="#f472b6" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M60 79 L60 84 M60 84 Q54 90 49 85 M60 84 Q66 90 71 85" fill="none" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="46" cy="82" r="1.5" fill="${OUT}"/><circle cx="74" cy="82" r="1.5" fill="${OUT}"/>
    </svg>`,
  },
  p: {
    letter: 'p',
    word: 'pig',
    accent: '#ec4899',
    accentDark: '#be185d',
    tint: '#fdf2f8',
    svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="106" rx="38" ry="6" fill="${OUT}" opacity=".12"/>
      <path d="M22 46 C14 22 34 16 46 34 Z" fill="#f9a8d4" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M98 46 C106 22 86 16 74 34 Z" fill="#f9a8d4" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M26 40 C24 30 30 26 36 34" fill="#f472b6"/>
      <path d="M94 40 C96 30 90 26 84 34" fill="#f472b6"/>
      <circle cx="60" cy="66" r="37" fill="#fbcfe8" stroke="${OUT}" stroke-width="4"/>
      <ellipse cx="44" cy="44" rx="10" ry="5" transform="rotate(-20 44 44)" fill="#fff" opacity=".6"/>
      <circle cx="44" cy="58" r="5" fill="${OUT}"/>
      <circle cx="76" cy="58" r="5" fill="${OUT}"/>
      <circle cx="45.6" cy="56.4" r="1.7" fill="#fff"/>
      <circle cx="77.6" cy="56.4" r="1.7" fill="#fff"/>
      <ellipse cx="60" cy="74" rx="17" ry="12" fill="#f472b6" stroke="${OUT}" stroke-width="3.5"/>
      <ellipse cx="54" cy="74" rx="3.2" ry="4.5" fill="#831843"/>
      <ellipse cx="66" cy="74" rx="3.2" ry="4.5" fill="#831843"/>
      <path d="M50 92 Q60 98 70 92" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="34" cy="74" r="5" fill="#f472b6" opacity=".55"/>
      <circle cx="86" cy="74" r="5" fill="#f472b6" opacity=".55"/>
    </svg>`,
  },
  i: {
    letter: 'i',
    word: 'igloo',
    accent: '#0ea5e9',
    accentDark: '#0369a1',
    tint: '#f0f9ff',
    svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="98" rx="52" ry="11" fill="#e0f2fe" stroke="${OUT}" stroke-width="4"/>
      <path d="M16 94 C16 50 36 28 60 28 C84 28 104 50 104 94 Z" fill="#f8fafc" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M84 36 C98 50 102 70 102 92 L90 92 C90 70 88 52 84 36 Z" fill="#bae6fd" opacity=".7"/>
      <path d="M21 70 H99 M30 50 H90 M60 28 V50 M42 50 V70 M78 50 V70 M30 70 V93 M90 70 V93" stroke="#7dd3fc" stroke-width="3" stroke-linecap="round"/>
      <path d="M44 94 V78 C44 64 76 64 76 78 V94 Z" fill="#0c4a6e" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M50 92 V80 C50 72 58 70 62 71" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="40" cy="38" rx="9" ry="4" transform="rotate(-25 40 38)" fill="#fff"/>
      <g fill="#7dd3fc"><path d="M18 22 l2.5 5 5 2.5 -5 2.5 -2.5 5 -2.5 -5 -5 -2.5 5 -2.5z"/><path d="M98 14 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z"/><circle cx="106" cy="40" r="2.5"/><circle cx="12" cy="48" r="2"/></g>
    </svg>`,
  },
  n: {
    letter: 'n',
    word: 'nest',
    accent: '#8b5cf6',
    accentDark: '#6d28d9',
    tint: '#f5f3ff',
    svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="106" rx="42" ry="6" fill="${OUT}" opacity=".12"/>
      <ellipse cx="44" cy="54" rx="13" ry="17" transform="rotate(-14 44 54)" fill="#7dd3fc" stroke="${OUT}" stroke-width="4"/>
      <ellipse cx="77" cy="53" rx="13" ry="17" transform="rotate(14 77 53)" fill="#fde047" stroke="${OUT}" stroke-width="4"/>
      <ellipse cx="60" cy="58" rx="13" ry="17" fill="#f9a8d4" stroke="${OUT}" stroke-width="4"/>
      <ellipse cx="40" cy="47" rx="3" ry="5" transform="rotate(-14 40 47)" fill="#fff" opacity=".8"/>
      <ellipse cx="56" cy="50" rx="3" ry="5" fill="#fff" opacity=".8"/>
      <ellipse cx="73" cy="46" rx="3" ry="5" transform="rotate(14 73 46)" fill="#fff" opacity=".8"/>
      <circle cx="47" cy="60" r="2" fill="#0284c7" opacity=".6"/><circle cx="64" cy="64" r="2" fill="#db2777" opacity=".6"/><circle cx="80" cy="60" r="2" fill="#ca8a04" opacity=".6"/>
      <path d="M12 64 C12 100 108 100 108 64 C88 76 32 76 12 64 Z" fill="#b45309" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M16 68 C38 82 82 82 104 68" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
      <path d="M22 78 C44 90 76 90 98 78" fill="none" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
      <path d="M32 88 C50 96 70 96 88 88" fill="none" stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M10 62 L4 56 M110 62 L117 57 M30 72 L22 66 M96 72 L104 68" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  },
};

export const SATPIN_LETTERS: SatpinLetter[] = ['s', 'a', 't', 'p', 'i', 'n'];

export const ANIMAL_STICKERS: AnimalSticker[] = [
  { id: 'lion', name: 'Sunny Lion', emoji: '🦁', bg: '#fef3c7', ring: '#f59e0b', tagline: 'Roaring with reading power!' },
  { id: 'panda', name: 'Happy Panda', emoji: '🐼', bg: '#dcfce7', ring: '#22c55e', tagline: 'Bamboozlingly smart!' },
  { id: 'bunny', name: 'Bouncy Bunny', emoji: '🐰', bg: '#fce7f3', ring: '#ec4899', tagline: 'Hopping through sounds!' },
  { id: 'koala', name: 'Cozy Koala', emoji: '🐨', bg: '#e0f2fe', ring: '#0ea5e9', tagline: 'Super sound listener!' },
  { id: 'frog', name: 'Springy Frog', emoji: '🐸', bg: '#ecfccb', ring: '#84cc16', tagline: 'Ribbit-ing phonics star!' },
  { id: 'unicorn', name: 'Magic Unicorn', emoji: '🦄', bg: '#ede9fe', ring: '#8b5cf6', tagline: 'Sparkling letter champion!' },
  { id: 'fox', name: 'Clever Fox', emoji: '🦊', bg: '#ffedd5', ring: '#f97316', tagline: 'Quick ears, bright eyes!' },
  { id: 'octopus', name: 'Tickly Octopus', emoji: '🐙', bg: '#ffe4e6', ring: '#f43f5e', tagline: 'Eight arms for high-fives!' },
];
