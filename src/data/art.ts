/**
 * Sticker-style illustrations (120×120) for keywords and blending words.
 * Shared ink outline, soft ground shadow, simple highlights.
 */

const INK = '#26213f';
const O = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
const O3 = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

const svg = (inner: string, shadow = 36) =>
  `<svg viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="107" rx="${shadow}" ry="6" fill="${INK}" opacity=".12"/>${inner}</svg>`;

const eyes = (x1: number, x2: number, y: number, r = 4.2) =>
  `<circle cx="${x1}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${INK}"/>` +
  `<circle cx="${x1 + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/><circle cx="${x2 + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/>`;

const smile = (x: number, y: number, w = 7) => `<path d="M${x - w} ${y} Q${x} ${y + w * 0.9} ${x + w} ${y}" fill="none" ${O3}/>`;
const cheeks = (x1: number, x2: number, y: number) =>
  `<circle cx="${x1}" cy="${y}" r="4.5" fill="#fb7185" opacity=".45"/><circle cx="${x2}" cy="${y}" r="4.5" fill="#fb7185" opacity=".45"/>`;
const shine = (x: number, y: number, rx = 7, ry = 4, rot = -30) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#fff" opacity=".7"/>`;

export const ART: Record<string, string> = {
  /* ---------------- Keywords ---------------- */
  cat: svg(`
    <path d="M28 46 L30 18 L50 34 Z M92 46 L90 18 L70 34 Z" fill="#fb923c" ${O}/>
    <path d="M33 38 L34 26 L44 34 Z M87 38 L86 26 L76 34 Z" fill="#fecdd3"/>
    <circle cx="60" cy="62" r="36" fill="#fdba74" ${O}/>
    <path d="M48 30 Q52 40 50 46 M60 27 V42 M72 30 Q68 40 70 46" fill="none" stroke="#ea7a2c" stroke-width="4" stroke-linecap="round"/>
    ${eyes(46, 74, 58, 5)}
    <path d="M55 68 H65 L60 74 Z" fill="#f472b6" ${O3}/>
    <path d="M60 74 V78 M60 78 Q54 84 50 79 M60 78 Q66 84 70 79" fill="none" ${O3}/>
    <path d="M24 66 H40 M24 74 L40 72 M96 66 H80 M96 74 L80 72" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    ${cheeks(40, 80, 72)}`),
  kite: svg(`
    <path d="M60 92 C56 100 66 102 62 110 M62 110 C58 116 66 118 62 120" fill="none" ${O3}/>
    <path d="M56 98 l-8 -4 0 8z M64 106 l8 -4 0 8z" fill="#f472b6" ${O3}/>
    <path d="M60 10 L94 48 L60 92 L26 48 Z" fill="#38bdf8" ${O}/>
    <path d="M60 10 L60 92 L26 48 Z" fill="#fde047"/>
    <path d="M60 50 L94 48 L60 92 Z" fill="#f472b6"/>
    <path d="M60 10 L94 48 L60 92 L26 48 Z M60 10 V92 M26 48 H94" fill="none" ${O}/>
    ${eyes(50, 70, 40, 3.5)}${smile(60, 50, 5)}`, 26),
  egg: svg(`
    <path d="M60 14 C84 14 98 52 98 74 C98 96 82 106 60 106 C38 106 22 96 22 74 C22 52 36 14 60 14 Z" fill="#fff7e6" ${O}/>
    <circle cx="78" cy="42" r="6" fill="#fcd34d" opacity=".7"/><circle cx="40" cy="70" r="5" fill="#fcd34d" opacity=".7"/><circle cx="76" cy="84" r="7" fill="#fcd34d" opacity=".7"/>
    ${shine(44, 36, 8, 13, -25)}`),
  hat: svg(`
    <ellipse cx="60" cy="80" rx="48" ry="14" fill="#3b82f6" ${O}/>
    <path d="M34 78 C34 40 86 40 86 78 Z" fill="#60a5fa" ${O}/>
    <path d="M35 68 C46 72 74 72 85 68 L86 76 C74 80 46 80 34 76 Z" fill="#f43f5e" ${O3}/>
    <circle cx="76" cy="64" r="7" fill="#fde047" ${O3}/>
    ${shine(46, 52, 6, 9, -20)}`, 46),
  rabbit: svg(`
    <path d="M44 50 C34 18 40 4 48 6 C56 8 56 30 54 46 Z M76 50 C86 18 80 4 72 6 C64 8 64 30 66 46 Z" fill="#f8fafc" ${O}/>
    <path d="M47 42 C42 24 44 14 48 14 C51 15 52 28 51 40 Z M73 42 C78 24 76 14 72 14 C69 15 68 28 69 40 Z" fill="#fbcfe8"/>
    <ellipse cx="60" cy="72" rx="34" ry="30" fill="#f8fafc" ${O}/>
    ${eyes(48, 72, 66, 4.6)}
    <ellipse cx="60" cy="78" rx="5" ry="3.5" fill="#f472b6"/>
    <path d="M60 81 V86 M56 86 h8 v7 h-8 z" fill="#fff" ${O3}/>
    ${cheeks(42, 78, 80)}`),
  moon: svg(`
    <path d="M70 12 C40 14 22 40 26 66 C30 92 58 108 84 98 C60 96 44 76 46 54 C48 34 58 20 70 12 Z" fill="#fde047" ${O}/>
    <path d="M38 58 q4 4 8 0 M38 72 q4 6 10 1" fill="none" ${O3}/>
    <circle cx="40" cy="80" r="4" fill="#fb7185" opacity=".5"/>
    <path d="M88 26 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z M96 64 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" fill="#fde047" ${O3}/>`),
  dog: svg(`
    <path d="M30 34 C14 40 16 74 28 78 C36 70 38 50 40 40 Z M90 34 C106 40 104 74 92 78 C84 70 82 50 80 40 Z" fill="#92400e" ${O}/>
    <ellipse cx="60" cy="62" rx="32" ry="34" fill="#d6a46c" ${O}/>
    <ellipse cx="60" cy="78" rx="18" ry="14" fill="#f5deb3"/>
    <circle cx="72" cy="50" r="9" fill="#92400e" opacity=".5"/>
    ${eyes(48, 72, 56, 4.6)}
    <ellipse cx="60" cy="70" rx="7" ry="5" fill="${INK}"/>
    <path d="M60 75 V80 M52 80 Q60 86 68 80" fill="none" ${O3}/>
    <path d="M57 82 q3 10 8 0" fill="#fb7185" ${O3}/>`),
  goat: svg(`
    <path d="M44 34 C38 16 26 14 22 22 C30 22 36 28 40 38 Z M76 34 C82 16 94 14 98 22 C90 22 84 28 80 38 Z" fill="#d1d5db" ${O}/>
    <path d="M34 48 L14 44 L30 56 Z M86 48 L106 44 L90 56 Z" fill="#f1f5f9" ${O}/>
    <path d="M36 44 C36 28 84 28 84 44 L80 82 C76 96 44 96 40 82 Z" fill="#f8fafc" ${O}/>
    ${eyes(49, 71, 54, 4.4)}
    <ellipse cx="60" cy="76" rx="12" ry="8" fill="#fbcfe8" ${O3}/>
    <circle cx="56" cy="76" r="1.8" fill="${INK}"/><circle cx="64" cy="76" r="1.8" fill="${INK}"/>
    <path d="M52 92 L60 108 L68 92 Z" fill="#e5e7eb" ${O3}/>`),
  octopus: svg(`
    <path d="M30 70 C22 86 30 98 38 92 M46 76 C42 94 52 104 56 94 M64 76 C66 94 78 102 80 92 M88 70 C98 84 92 98 84 92" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
    <path d="M30 70 C22 86 30 98 38 92 M46 76 C42 94 52 104 56 94 M64 76 C66 94 78 102 80 92 M88 70 C98 84 92 98 84 92" fill="none" stroke="#c084fc" stroke-width="6" stroke-linecap="round"/>
    <path d="M24 64 C24 22 96 22 96 64 C96 80 24 80 24 64 Z" fill="#c084fc" ${O}/>
    ${shine(42, 36, 9, 5)}
    ${eyes(48, 72, 56, 5)}${smile(60, 66, 7)}${cheeks(40, 80, 64)}`),
  umbrella: svg(`
    <path d="M60 58 V92 C60 104 44 104 44 94" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <path d="M60 58 V92 C60 104 44 104 44 94" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M12 60 C12 28 108 28 108 60 C100 52 88 52 84 60 C78 52 66 52 60 60 C54 52 42 52 36 60 C32 52 20 52 12 60 Z" fill="#f43f5e" ${O}/>
    <path d="M36 60 C40 40 50 30 60 26 C70 30 80 40 84 60 C78 52 66 52 60 60 C54 52 42 52 36 60 Z" fill="#fde047"/>
    <path d="M12 60 C12 28 108 28 108 60 C100 52 88 52 84 60 C78 52 66 52 60 60 C54 52 42 52 36 60 C32 52 20 52 12 60 Z" fill="none" ${O}/>
    <circle cx="60" cy="25" r="4" fill="#f43f5e" ${O3}/>`, 30),
  leaf: svg(`
    <path d="M24 94 C14 50 50 14 100 18 C104 66 70 102 24 94 Z" fill="#4ade80" ${O}/>
    <path d="M24 94 C46 70 66 50 92 26 M48 70 L44 52 M60 58 L74 60 M66 50 L62 36 M40 80 L58 82" fill="none" stroke="#15803d" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M24 94 L14 104" ${O}/>
    ${shine(50, 44, 9, 5, -40)}`),
  fish: svg(`
    <path d="M84 60 L108 38 L106 82 Z" fill="#fb923c" ${O}/>
    <ellipse cx="54" cy="60" rx="38" ry="28" fill="#fdba74" ${O}/>
    <path d="M50 34 C56 24 70 26 74 36" fill="#fb923c" ${O3}/>
    <path d="M62 50 C70 56 70 66 62 72" fill="none" stroke="#ea7a2c" stroke-width="3.5" stroke-linecap="round"/>
    ${eyes(34, 34, 54, 5.2)}
    <path d="M18 66 q6 4 10 0" fill="none" ${O3}/>
    ${shine(46, 44, 8, 4, -15)}`),
  ball: svg(`
    <circle cx="60" cy="60" r="42" fill="#fff" ${O}/>
    <path d="M60 18 C40 34 40 86 60 102 C46 92 30 74 20 66 C22 40 36 24 60 18 Z" fill="#f43f5e"/>
    <path d="M60 18 C80 34 80 86 60 102 C74 92 90 74 100 66 C98 40 84 24 60 18 Z" fill="#3b82f6"/>
    <path d="M60 18 C46 30 48 88 60 102 C72 88 74 30 60 18 Z" fill="#fde047"/>
    <circle cx="60" cy="60" r="42" fill="none" ${O}/>
    ${shine(44, 36, 10, 6)}`),
  jam: svg(`
    <path d="M32 40 H88 V92 C88 100 82 104 76 104 H44 C38 104 32 100 32 92 Z" fill="#dc2626" ${O}/>
    <path d="M38 44 H82 V56 C70 62 50 50 38 56 Z" fill="#f87171" opacity=".7"/>
    <rect x="40" y="62" width="40" height="26" rx="6" fill="#fff7e6" ${O3}/>
    <path d="M52 76 c0-6 8-6 8 0 c0-6 8-6 8 0 c0 6-8 10-8 10 s-8-4-8-10z" fill="#dc2626"/>
    <path d="M28 30 C28 22 92 22 92 30 L90 42 H30 Z" fill="#fff" ${O}/>
    <path d="M36 26 v14 M48 24 v16 M60 23 v17 M72 24 v16 M84 26 v14" stroke="#f43f5e" stroke-width="5"/>
    <path d="M28 30 C28 22 92 22 92 30 L90 42 H30 Z" fill="none" ${O}/>`),
  zebra: svg(`
    <path d="M40 28 L34 8 L52 22 Z M80 28 L86 8 L68 22 Z" fill="#f8fafc" ${O}/>
    <path d="M50 16 C54 6 66 6 70 16 L66 30 H54 Z" fill="${INK}"/>
    <path d="M38 34 C38 18 82 18 82 34 L78 84 C74 104 46 104 42 84 Z" fill="#f8fafc" ${O}/>
    <path d="M40 40 L54 44 M39 52 L52 54 M80 40 L66 44 M81 52 L68 54 M44 66 L52 64 M76 66 L68 64" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="60" cy="86" rx="18" ry="13" fill="#9ca3af" ${O3}/>
    <circle cx="54" cy="86" r="2.4" fill="${INK}"/><circle cx="66" cy="86" r="2.4" fill="${INK}"/>
    ${eyes(50, 70, 58, 4.2)}`),
  web: svg(`
    <g fill="none" stroke="#94a3b8" stroke-width="2.5">
      <path d="M60 10 V104 M14 57 H106 M26 24 L94 90 M94 24 L26 90"/>
      <path d="M60 22 L84 33 L94 57 L84 81 L60 92 L36 81 L26 57 L36 33 Z"/>
      <path d="M60 36 L75 42 L80 57 L75 72 L60 78 L45 72 L40 57 L45 42 Z"/>
      <path d="M60 48 L66 51 L69 57 L66 63 L60 66 L54 63 L51 57 L54 51 Z"/>
    </g>
    <path d="M84 33 V46" stroke="${INK}" stroke-width="2"/>
    <circle cx="84" cy="52" r="7" fill="${INK}"/>
    <path d="M78 48 l-6 -4 M78 54 l-7 2 M90 48 l6 -4 M90 54 l7 2" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="82" cy="51" r="1.5" fill="#fff"/><circle cx="86" cy="51" r="1.5" fill="#fff"/>`, 30),
  van: svg(`
    <path d="M10 82 V46 C10 38 16 32 24 32 H76 C84 32 90 36 94 44 L106 64 C108 68 110 72 110 76 V82 C110 88 106 90 100 90 H18 C12 90 10 88 10 82 Z" fill="#a78bfa" ${O}/>
    <path d="M78 40 H86 C88 40 90 42 92 44 L102 62 H78 Z" fill="#bae6fd" ${O3}/>
    <rect x="20" y="40" width="22" height="20" rx="4" fill="#bae6fd" ${O3}/>
    <rect x="48" y="40" width="22" height="20" rx="4" fill="#bae6fd" ${O3}/>
    <path d="M10 70 H110" stroke="#7c3aed" stroke-width="4"/>
    <circle cx="32" cy="90" r="11" fill="#475569" ${O}/><circle cx="32" cy="90" r="4" fill="#cbd5e1"/>
    <circle cx="88" cy="90" r="11" fill="#475569" ${O}/><circle cx="88" cy="90" r="4" fill="#cbd5e1"/>
    <circle cx="104" cy="74" r="3" fill="#fde047"/>`, 48),
  yoyo: svg(`
    <path d="M60 8 C66 16 54 22 60 30" fill="none" ${O3}/>
    <circle cx="60" cy="66" r="36" fill="#f43f5e" ${O}/>
    <circle cx="60" cy="66" r="24" fill="#fb7185" ${O3}/>
    <circle cx="60" cy="66" r="7" fill="#fde047" ${O3}/>
    <path d="M60 30 V59" stroke="${INK}" stroke-width="3"/>
    ${shine(42, 46, 8, 5)}`),

  /* ---------------- Blending words ---------------- */
  pin: svg(`
    <path d="M44 62 L30 24 M62 58 L66 18 M78 62 L96 28" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M44 62 L30 24 M62 58 L66 18 M78 62 L96 28" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
    <circle cx="30" cy="22" r="8" fill="#3b82f6" ${O3}/><circle cx="66" cy="16" r="8" fill="#fde047" ${O3}/><circle cx="96" cy="26" r="8" fill="#a855f7" ${O3}/>
    <ellipse cx="60" cy="78" rx="38" ry="26" fill="#ef4444" ${O}/>
    <path d="M60 52 V104 M36 60 C46 76 46 92 40 100 M84 60 C74 76 74 92 80 100" fill="none" stroke="#b91c1c" stroke-width="3"/>
    <path d="M50 54 L60 46 L70 54 L60 58 Z" fill="#22c55e" ${O3}/>
    ${shine(44, 68, 8, 4)}`, 40),
  pan: svg(`
    <path d="M78 64 L112 44" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
    <path d="M78 64 L112 44" stroke="#78350f" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="48" cy="70" rx="40" ry="24" fill="#475569" ${O}/>
    <ellipse cx="48" cy="66" rx="31" ry="16" fill="#1e293b"/>
    <path d="M28 62 Q38 56 50 58" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>`, 44),
  tap: svg(`
    <path d="M20 40 H64 C78 40 86 48 86 62 V70 H70 V62 C70 58 68 56 64 56 H20 Z" fill="#cbd5e1" ${O}/>
    <rect x="34" y="20" width="16" height="20" rx="3" fill="#94a3b8" ${O}/>
    <rect x="22" y="14" width="40" height="10" rx="5" fill="#ef4444" ${O3}/>
    <rect x="10" y="36" width="12" height="24" rx="3" fill="#94a3b8" ${O}/>
    <path d="M78 76 C70 88 70 94 78 96 C86 94 86 88 78 76 Z" fill="#38bdf8" ${O3}/>
    ${shine(44, 46, 7, 3, 0)}`, 30),
  tin: svg(`
    <rect x="30" y="26" width="60" height="74" rx="8" fill="#cbd5e1" ${O}/>
    <ellipse cx="60" cy="27" rx="30" ry="8" fill="#e2e8f0" ${O}/>
    <rect x="30" y="44" width="60" height="38" fill="#f97316" ${O3}/>
    <circle cx="60" cy="63" r="11" fill="#fde047" ${O3}/>
    <path d="M30 34 V96" stroke="#fff" stroke-width="5" opacity=".6"/>`, 32),
  ant: svg(`
    <path d="M42 70 L30 90 M58 72 L56 94 M74 70 L84 90 M44 66 L24 62 M76 64 L98 70" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="90" cy="54" r="12" fill="#b91c1c" ${O}/>
    <ellipse cx="62" cy="64" rx="13" ry="11" fill="#b91c1c" ${O}/>
    <ellipse cx="30" cy="66" rx="20" ry="16" fill="#b91c1c" ${O}/>
    <path d="M92 44 C94 32 102 28 106 30 M86 44 C84 32 90 24 96 22" fill="none" ${O3}/>
    <circle cx="94" cy="52" r="3" fill="#fff"/><circle cx="95" cy="52" r="1.6" fill="${INK}"/>
    ${shine(24, 60, 6, 3)}`),
  rat: svg(`
    <path d="M90 84 C110 80 112 60 100 56" fill="none" stroke="#f9a8d4" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="64" cy="76" rx="32" ry="22" fill="#9ca3af" ${O}/>
    <circle cx="38" cy="42" r="12" fill="#9ca3af" ${O}/><circle cx="38" cy="42" r="6" fill="#f9a8d4"/>
    <path d="M30 56 C30 44 56 44 58 56 L48 82 C40 84 24 72 30 56 Z" fill="#9ca3af" ${O}/>
    <circle cx="26" cy="74" r="4" fill="#f472b6" ${O3}/>
    <circle cx="42" cy="60" r="3.6" fill="${INK}"/><circle cx="43" cy="59" r="1.2" fill="#fff"/>
    <path d="M30 70 L14 66 M30 74 L14 76" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`),
  map: svg(`
    <path d="M14 30 L44 20 L76 30 L106 20 V90 L76 100 L44 90 L14 100 Z" fill="#fef3c7" ${O}/>
    <path d="M44 20 V90 M76 30 V100" stroke="#e7c87a" stroke-width="3"/>
    <path d="M26 82 C34 70 46 74 52 62 C58 50 70 56 80 46" fill="none" stroke="#ef4444" stroke-width="3.5" stroke-dasharray="2 7" stroke-linecap="round"/>
    <path d="M84 38 l10 10 M94 38 l-10 10" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M22 40 q8 -6 14 2" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>`, 46),
  pen: svg(`
    <path d="M26 98 L34 74 L84 24 L100 40 L50 90 Z" fill="#3b82f6" ${O}/>
    <path d="M26 98 L34 74 L50 90 Z" fill="#fde68a" ${O3}/>
    <path d="M26 98 L30 88 L36 94 Z" fill="${INK}"/>
    <path d="M74 34 L90 50" stroke="${INK}" stroke-width="4"/>
    <path d="M84 24 L94 14 C98 10 106 18 102 22 L92 32" fill="#1d4ed8" ${O}/>`, 30),
  hen: svg(`
    <path d="M52 20 c-4 -10 8 -12 8 -4 c2 -10 14 -6 8 4 c8 -4 10 8 2 8 z" fill="#ef4444" ${O3}/>
    <path d="M30 70 C30 44 46 26 62 26 C78 26 84 40 82 52 C98 44 108 56 104 70 C100 92 82 100 62 100 C42 100 30 90 30 70 Z" fill="#f8fafc" ${O}/>
    <path d="M38 40 L22 46 L38 52 Z" fill="#f59e0b" ${O3}/>
    <path d="M40 52 c4 10 0 16 -4 16" fill="#ef4444" ${O3}/>
    <circle cx="50" cy="40" r="4" fill="${INK}"/><circle cx="51.4" cy="38.6" r="1.4" fill="#fff"/>
    <path d="M58 66 C66 58 82 62 84 74 C74 80 62 78 58 66 Z" fill="#e5e7eb" ${O3}/>
    <path d="M52 100 v8 M70 100 v8" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>`),
  net: svg(`
    <path d="M70 66 L104 108" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M70 66 L104 108" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>
    <path d="M22 40 C18 70 34 96 50 96 C64 96 72 70 70 50" fill="#ecfeff" opacity=".8" ${O3}/>
    <path d="M30 60 L66 66 M28 76 L60 82 M38 44 L44 94 M52 44 L56 94" stroke="#94a3b8" stroke-width="2"/>
    <ellipse cx="46" cy="42" rx="26" ry="12" fill="none" stroke="#ef4444" stroke-width="6"/>
    <ellipse cx="46" cy="42" rx="26" ry="12" fill="none" ${O3}/>`, 32),
  sun: svg(`
    <g stroke="#f59e0b" stroke-width="7" stroke-linecap="round">
      <path d="M60 8 V20 M60 100 V112 M8 60 H20 M100 60 H112 M23 23 L32 32 M88 88 L97 97 M97 23 L88 32 M32 88 L23 97"/>
    </g>
    <circle cx="60" cy="60" r="32" fill="#fde047" ${O}/>
    ${eyes(49, 71, 56, 4.2)}${smile(60, 66, 9)}${cheeks(42, 78, 66)}
    ${shine(46, 44, 7, 4)}`, 26),
  bus: svg(`
    <rect x="12" y="24" width="96" height="62" rx="12" fill="#facc15" ${O}/>
    <rect x="20" y="34" width="20" height="20" rx="4" fill="#bae6fd" ${O3}/>
    <rect x="46" y="34" width="20" height="20" rx="4" fill="#bae6fd" ${O3}/>
    <rect x="72" y="34" width="28" height="20" rx="4" fill="#bae6fd" ${O3}/>
    <path d="M12 66 H108" stroke="#ca8a04" stroke-width="5"/>
    <rect x="100" y="60" width="8" height="8" rx="2" fill="#fff"/>
    <circle cx="34" cy="88" r="11" fill="#475569" ${O}/><circle cx="34" cy="88" r="4" fill="#cbd5e1"/>
    <circle cx="86" cy="88" r="11" fill="#475569" ${O}/><circle cx="86" cy="88" r="4" fill="#cbd5e1"/>`, 48),
  cup: svg(`
    <path d="M44 20 c-6 8 6 10 0 18 M60 14 c-6 8 6 10 0 18 M76 20 c-6 8 6 10 0 18" fill="none" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M84 52 C104 50 104 82 80 80" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <path d="M84 52 C104 50 104 82 80 80" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
    <path d="M24 44 H88 L82 92 C80 100 74 104 66 104 H46 C38 104 32 100 30 92 Z" fill="#38bdf8" ${O}/>
    <ellipse cx="56" cy="44" rx="32" ry="7" fill="#7c2d12" ${O3}/>
    <path d="M44 66 c0-7 9-7 9 0 c0-7 9-7 9 0 c0 7-9 11-9 11 s-9-4-9-11z" fill="#fff" opacity=".8"/>`, 34),
  bug: svg(`
    <path d="M30 74 L16 82 M34 88 L22 100 M90 74 L104 82 M86 88 L98 100 M40 60 L26 52 M80 60 L94 52" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="60" cy="38" r="16" fill="${INK}"/>
    <path d="M52 26 C48 16 42 14 38 16 M68 26 C72 16 78 14 82 16" fill="none" ${O3}/>
    <ellipse cx="60" cy="72" rx="34" ry="30" fill="#ef4444" ${O}/>
    <path d="M60 42 V102" stroke="${INK}" stroke-width="4"/>
    <circle cx="44" cy="62" r="6" fill="${INK}"/><circle cx="76" cy="62" r="6" fill="${INK}"/><circle cx="46" cy="84" r="5" fill="${INK}"/><circle cx="74" cy="84" r="5" fill="${INK}"/>
    <circle cx="54" cy="36" r="3" fill="#fff"/><circle cx="66" cy="36" r="3" fill="#fff"/>
    ${shine(42, 54, 6, 3)}`),
  bag: svg(`
    <path d="M40 40 C40 14 80 14 80 40" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M40 40 C40 14 80 14 80 40" fill="none" stroke="#f472b6" stroke-width="4" stroke-linecap="round"/>
    <path d="M22 40 H98 L92 98 C92 102 88 104 84 104 H36 C32 104 28 102 28 98 Z" fill="#ec4899" ${O}/>
    <rect x="40" y="58" width="40" height="24" rx="6" fill="#fbcfe8" ${O3}/>
    <path d="M28 46 V96" stroke="#fff" stroke-width="5" opacity=".45"/>`, 38),
  bed: svg(`
    <path d="M12 30 V100 M108 58 V100" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    <path d="M12 30 V100 M108 58 V100" stroke="#b45309" stroke-width="5" stroke-linecap="round"/>
    <rect x="12" y="68" width="96" height="20" rx="4" fill="#d97706" ${O}/>
    <rect x="18" y="52" width="30" height="18" rx="9" fill="#fff" ${O3}/>
    <path d="M42 70 C42 54 104 52 104 70 Z" fill="#60a5fa" ${O}/>
    <path d="M56 62 l6 4 M72 60 l6 4 M88 60 l6 4" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`, 50),
  fan: svg(`
    <path d="M60 96 L14 58 C20 30 40 16 60 14 C80 16 100 30 106 58 Z" fill="#fda4af" ${O}/>
    <path d="M60 96 L28 34 M60 96 L44 20 M60 96 L60 14 M60 96 L76 20 M60 96 L92 34" stroke="${INK}" stroke-width="2.5"/>
    <path d="M60 96 L14 58 C18 52 22 44 28 34 Z M60 96 L44 20 L60 14 Z M60 96 L76 20 L92 34 Z" fill="#f43f5e" opacity=".55"/>
    <path d="M60 96 L14 58 C20 30 40 16 60 14 C80 16 100 30 106 58 Z" fill="none" ${O}/>
    <circle cx="60" cy="96" r="7" fill="#fde047" ${O3}/>`, 30),
  log: svg(`
    <path d="M28 46 H88 C100 46 106 58 106 70 C106 82 100 94 88 94 H28 Z" fill="#a16207" ${O}/>
    <path d="M44 58 H86 M38 76 H92" stroke="#713f12" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="28" cy="70" rx="16" ry="24" fill="#fcd34d" ${O}/>
    <ellipse cx="28" cy="70" rx="9" ry="14" fill="none" stroke="#b45309" stroke-width="3"/>
    <ellipse cx="28" cy="70" rx="3" ry="5" fill="#b45309"/>
    <path d="M80 46 C82 34 92 32 94 38 C90 38 86 42 86 46" fill="#4ade80" ${O3}/>`, 44),
  mop: svg(`
    <path d="M80 12 L56 70" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M80 12 L56 70" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
    <path d="M40 70 H72 L74 78 H38 Z" fill="#94a3b8" ${O3}/>
    <path d="M40 78 C34 92 32 100 28 104 M46 78 C44 92 42 100 40 106 M54 78 C54 92 52 100 52 106 M62 78 C64 92 64 100 66 106 M70 78 C74 92 78 100 82 104" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M40 78 C34 92 32 100 28 104 M46 78 C44 92 42 100 40 106 M54 78 C54 92 52 100 52 106 M62 78 C64 92 64 100 66 106 M70 78 C74 92 78 100 82 104" fill="none" stroke="#fef3c7" stroke-width="3" stroke-linecap="round"/>`, 32),
  pot: svg(`
    <path d="M44 22 c-6 8 6 10 0 16 M76 22 c-6 8 6 10 0 16" fill="none" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="10" y="56" width="16" height="10" rx="5" fill="#475569" ${O3}/>
    <rect x="94" y="56" width="16" height="10" rx="5" fill="#475569" ${O3}/>
    <path d="M22 50 H98 V88 C98 98 90 104 80 104 H40 C30 104 22 98 22 88 Z" fill="#64748b" ${O}/>
    <path d="M18 50 C18 40 102 40 102 50 Z" fill="#94a3b8" ${O}/>
    <rect x="52" y="34" width="16" height="8" rx="4" fill="#475569" ${O3}/>
    <path d="M30 60 V94" stroke="#fff" stroke-width="5" opacity=".35"/>`, 42),
  jug: svg(`
    <path d="M84 40 C106 40 106 82 82 80" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <path d="M84 40 C106 40 106 82 82 80" fill="none" stroke="#a78bfa" stroke-width="6" stroke-linecap="round"/>
    <path d="M34 18 H82 L86 30 C90 40 92 52 92 70 C92 92 80 104 60 104 C40 104 28 92 28 70 C28 52 30 40 34 30 L24 22 Z" fill="#c4b5fd" ${O}/>
    <path d="M32 58 C46 64 74 52 90 58 V70 C90 92 80 102 60 102 C40 102 30 92 30 70 Z" fill="#38bdf8" opacity=".8"/>
    <path d="M34 18 H82 L86 30 C90 40 92 52 92 70 C92 92 80 104 60 104 C40 104 28 92 28 70 C28 52 30 40 34 30 L24 22 Z" fill="none" ${O}/>
    ${shine(42, 42, 5, 10, 0)}`, 36),
  zip: svg(`
    <path d="M14 46 C14 36 22 32 30 32 H90 C98 32 106 36 106 46 V88 C106 96 100 100 92 100 H28 C20 100 14 96 14 88 Z" fill="#60a5fa" ${O}/>
    <path d="M20 46 H100" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M24 46 H96" stroke="#e5e7eb" stroke-width="3" stroke-dasharray="3 3"/>
    <rect x="70" y="38" width="16" height="14" rx="3" fill="#fbbf24" ${O3}/>
    <path d="M74 52 h8 v18 c0 6 -8 6 -8 0 z" fill="#fbbf24" ${O3}/>
    <circle cx="40" cy="74" r="7" fill="#fde047" opacity=".8"/><circle cx="60" cy="80" r="5" fill="#f472b6" opacity=".8"/>
    ${shine(30, 60, 6, 10, 0)}`, 46),
  jet: svg(`
    <path d="M52 52 L30 18 H42 L74 52 Z" fill="#93c5fd" ${O}/>
    <path d="M52 72 L30 104 H42 L74 72 Z" fill="#93c5fd" ${O}/>
    <path d="M14 62 C14 54 22 50 32 50 H92 C104 50 112 56 112 62 C112 68 104 74 92 74 H32 C22 74 14 70 14 62 Z" fill="#f8fafc" ${O}/>
    <path d="M14 62 L8 42 H18 L30 54" fill="#ef4444" ${O3}/>
    <path d="M92 54 C100 54 106 58 108 62 H92 Z" fill="#38bdf8" ${O3}/>
    <circle cx="50" cy="62" r="4" fill="#38bdf8" ${O3}/><circle cx="64" cy="62" r="4" fill="#38bdf8" ${O3}/><circle cx="78" cy="62" r="4" fill="#38bdf8" ${O3}/>
    <path d="M4 80 h14 M10 88 h10" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>`, 44),
};
