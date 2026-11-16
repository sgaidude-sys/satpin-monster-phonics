import './style.css';
import {
  ANIMAL_STICKERS,
  SATPIN_ITEMS,
  SATPIN_LETTERS,
  type AnimalSticker,
  type SatpinLetter,
} from './data/phonics';
import { engine, unlockAudio } from './audio/engine';
import * as sfx from './audio/sfx';
import { startMusic } from './audio/music';
import { isNarratorSpeaking, playPhoneme, preloadRecordings, say, stopSpeech } from './audio/voice';
import {
  loadProgression,
  MASTERY_TARGET,
  pickNextTargetLetter,
  pickRoundChoices,
  recordAttempt,
  resetProgression,
  ROUNDS_PER_CELEBRATION,
  type ProgressionState,
} from './state/progression';
import { MonsterCanvasController } from './canvas/monsterCanvas';
import { ParticleCanvasController } from './canvas/particleCanvas';
import { SceneCanvas } from './canvas/sceneCanvas';

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const ICON = {
  speaker: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9.2v5.6c0 .4.3.7.7.7h3.6l4.4 3.9c.5.4 1.3.1 1.3-.6V5.2c0-.7-.8-1-1.3-.6L7.3 8.5H3.7c-.4 0-.7.3-.7.7z"/><path d="M16 8.6a4.8 4.8 0 0 1 0 6.8M18.8 5.8a8.8 8.8 0 0 1 0 12.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2.4" fill="#fff"/><circle cx="15.5" cy="12" r="2.4" fill="#fff"/><circle cx="7.5" cy="18" r="2.4" fill="#fff"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h4.5v-5.5h4V20h4.5V10"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.6v14.8a1.1 1.1 0 0 0 1.7.9l11.6-7.4a1.1 1.1 0 0 0 0-1.8L8.7 3.7A1.1 1.1 0 0 0 7 4.6z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
};

function starPath(cx: number, cy: number, r: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : inner;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const STAR_D = starPath(20, 21, 18, 8.6);
const STAR_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <path class="star-empty" stroke-width="2.5" stroke-linejoin="round" d="${STAR_D}"/>
  <g class="star-full">
    <path fill="url(#starGrad)" stroke="#c46a00" stroke-width="2.6" stroke-linejoin="round" d="${STAR_D}"/>
    <ellipse cx="15" cy="15" rx="3.2" ry="1.8" transform="rotate(-35 15 15)" fill="#fff" opacity=".85"/>
  </g>
</svg>`;

const PRAISE = ['Yum!', 'Yummy!', 'Tasty!', 'Delish!', 'Munch!', 'Super!'];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface DragState {
  card: HTMLButtonElement;
  letter: SatpinLetter;
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  vx: number;
  lastX: number;
  lastT: number;
  moved: boolean;
  home: DOMRect;
  trailAcc: number;
}

/* ------------------------------------------------------------------ */
/*  Game                                                               */
/* ------------------------------------------------------------------ */

class PhonicsGame {
  private root: HTMLElement;
  private state: ProgressionState;
  private target: SatpinLetter;
  private choices: SatpinLetter[];
  private locked = true;
  private wrongThisRound = 0;
  private streak = 0;
  private hint = false;
  private displayedStars: number;
  private sayToken = 0;
  private idleTimer: number | undefined;
  private drag: DragState | null = null;
  private started = false;

  private scene!: SceneCanvas;
  private monster!: MonsterCanvasController;
  private titleMonster!: MonsterCanvasController;
  private fx!: ParticleCanvasController;

  private el!: {
    stage: HTMLElement;
    cards: HTMLElement;
    stars: HTMLElement;
    mastery: HTMLElement;
    listen: HTMLButtonElement;
    hintBubble: HTMLElement;
    hintBtn: HTMLButtonElement;
    settingsBtn: HTMLButtonElement;
    bookBtn: HTMLButtonElement;
    bookCount: HTMLElement;
    title: HTMLElement;
    modal: HTMLElement;
    settings: HTMLElement;
    streak: HTMLElement;
    monsterCanvas: HTMLCanvasElement;
  };

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = loadProgression();
    this.displayedStars = this.state.roundProgress;
    this.target = pickNextTargetLetter(this.state);
    this.choices = pickRoundChoices(this.target);
    this.render();
    this.scene = new SceneCanvas(this.root.querySelector('#scene')!);
    this.fx = new ParticleCanvasController(this.root.querySelector('#fx')!);
    this.monster = new MonsterCanvasController(this.el.monsterCanvas);
    this.titleMonster = new MonsterCanvasController(this.root.querySelector('#title-monster')!, {
      idleMood: 'wave',
      sizeFactor: 1.05,
    });
    this.monster.setVoiceProviders(() => engine.voiceLevel(), isNarratorSpeaking);
    this.titleMonster.setVoiceProviders(() => engine.voiceLevel(), isNarratorSpeaking);
    this.bind();
    this.renderHud();
    this.renderSettings();
  }

  /* ---------------------------------------------------------------- */
  /*  DOM                                                              */
  /* ---------------------------------------------------------------- */

  private render(): void {
    const stars = Array.from({ length: ROUNDS_PER_CELEBRATION }, (_, i) => `<div class="star-slot" data-i="${i}">${STAR_SVG}</div>`).join('');
    const logo = "Munchy's"
      .split('')
      .map((ch, i) => {
        const colors = ['#ff5d8f', '#ffb020', '#2ed47a', '#29b6f6', '#9b6dff', '#ff7ac6', '#ffd23f', '#22c5c5'];
        return `<span style="--c:${colors[i % colors.length]};--i:${i}">${ch}</span>`;
      })
      .join('');

    this.root.innerHTML = `
      <div class="game at-title">
        <svg width="0" height="0" style="position:absolute" aria-hidden="true">
          <defs>
            <linearGradient id="starGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#fff6b0"/>
              <stop offset=".45" stop-color="#ffd23f"/>
              <stop offset="1" stop-color="#ff9a1a"/>
            </linearGradient>
          </defs>
        </svg>
        <canvas id="scene" class="layer-scene"></canvas>

        <header class="hud">
          <div class="hud-group">
            <button class="icon-btn" id="btn-home" type="button" aria-label="Back to title">${ICON.home}</button>
            <div class="mastery" id="mastery" aria-label="Letter mastery"></div>
          </div>
          <div class="star-meter" id="stars" aria-label="Stars towards the next sticker">${stars}</div>
          <div class="hud-group">
            <button class="icon-btn" id="btn-hint" type="button" aria-label="Show the letter hint" aria-pressed="false">${ICON.eye}</button>
            <button class="icon-btn" id="btn-settings" type="button" aria-label="Sound settings" aria-expanded="false">${ICON.settings}</button>
            <button class="sticker-btn" id="btn-book" type="button" aria-label="Open sticker book">
              <span class="emoji" aria-hidden="true">📒</span>
              <span class="label">Stickers</span>
              <span class="count" id="book-count">0/${ANIMAL_STICKERS.length}</span>
            </button>
          </div>
        </header>

        <div class="streak" id="streak" aria-live="polite"></div>

        <main class="stage" id="stage">
          <section class="monster-zone">
            <button class="listen-btn" id="btn-listen" type="button" aria-label="Hear the sound again">
              <span class="listen-icon">${ICON.speaker}</span>
              <span class="listen-label"><b>Listen!</b><small>Which card starts with this sound?</small></span>
            </button>
            <div class="hint-bubble" id="hint-bubble" aria-hidden="true"><span></span></div>
            <canvas class="monster-canvas" id="monster" aria-label="Munchy the monster. Tap to hear the sound again." role="img"></canvas>
          </section>
          <section class="cards-zone">
            <div class="cards" id="cards"></div>
            <p class="instruction">Drag or tap the right card into Munchy's mouth!</p>
          </section>
        </main>

        <div class="settings" id="settings" role="dialog" aria-label="Settings"></div>

        <div class="title" id="title">
          <div class="logo">
            <div class="logo-top" aria-label="Munchy's">${logo}</div>
            <div class="logo-bottom">Phonics Feast</div>
          </div>
          <canvas class="title-monster" id="title-monster" aria-hidden="true"></canvas>
          <button class="play-btn" id="btn-play" type="button">${ICON.play}<span>Play!</span></button>
          <p class="title-sub">Listen to the sound · feed Munchy the matching letter</p>
        </div>

        <div class="modal" id="modal"></div>
        <canvas id="fx" class="layer-fx"></canvas>
      </div>
    `;

    const q = <T extends HTMLElement>(s: string) => this.root.querySelector(s) as T;
    this.el = {
      stage: q('#stage'),
      cards: q('#cards'),
      stars: q('#stars'),
      mastery: q('#mastery'),
      listen: q('#btn-listen'),
      hintBubble: q('#hint-bubble'),
      hintBtn: q('#btn-hint'),
      settingsBtn: q('#btn-settings'),
      bookBtn: q('#btn-book'),
      bookCount: q('#book-count'),
      title: q('#title'),
      modal: q('#modal'),
      settings: q('#settings'),
      streak: q('#streak'),
      monsterCanvas: q('#monster'),
    };
  }

  private bind(): void {
    const { el } = this;
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());

    q(this.root, '#btn-play').addEventListener('click', () => this.start());

    q(this.root, '#btn-home').addEventListener('click', () => {
      sfx.sfxTap(0.9);
      this.closeSettings();
      this.showTitle();
    });

    el.listen.addEventListener('click', () => {
      if (this.locked) return;
      sfx.sfxTap(1.1);
      this.sayTarget();
    });

    el.monsterCanvas.addEventListener('click', () => {
      unlockAudio();
      this.monster.poke();
      sfx.sfxGiggle();
      this.fx.hearts(this.monster.getMouthScreenPosition().x, this.monster.getMouthScreenPosition().y - 80, 3);
      if (!this.locked) setTimeout(() => this.sayTarget(), 450);
    });

    el.hintBtn.addEventListener('click', () => {
      this.hint = !this.hint;
      sfx.sfxToggle(this.hint);
      this.renderHint();
    });

    el.settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.settings.classList.contains('open')) this.closeSettings();
      else {
        el.settings.classList.add('open');
        el.settingsBtn.setAttribute('aria-expanded', 'true');
        sfx.sfxPanel(true);
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!el.settings.classList.contains('open')) return;
      const t = e.target as Node;
      if (!el.settings.contains(t) && !el.settingsBtn.contains(t)) this.closeSettings();
    });

    el.bookBtn.addEventListener('click', () => this.openBook());
    el.modal.addEventListener('click', (e) => {
      if (e.target === el.modal && el.modal.dataset.kind === 'book') this.closeModal();
    });

    engine.onSettingsChange(() => this.renderSettings());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSettings();
        if (el.modal.dataset.kind === 'book') this.closeModal();
      }
    });

    document.addEventListener('pointerdown', () => this.bumpIdle(), { passive: true });
  }

  private closeSettings(): void {
    if (!this.el.settings.classList.contains('open')) return;
    this.el.settings.classList.remove('open');
    this.el.settingsBtn.setAttribute('aria-expanded', 'false');
    sfx.sfxPanel(false);
  }

  private renderSettings(): void {
    const s = engine.settings;
    const row = (key: string, label: string, on: boolean) =>
      `<button type="button" class="toggle-row" role="switch" aria-checked="${on}" data-key="${key}">
        <span>${label}</span><span class="switch"></span>
      </button>`;
    this.el.settings.innerHTML = `
      <h3>Settings</h3>
      ${row('music', '🎵 Music', s.music)}
      ${row('sfx', '🔔 Sound effects', s.sfx)}
      ${row('narrator', '🗣️ Spoken words', s.narrator)}
      <button type="button" class="reset-btn" id="btn-reset">Reset progress</button>
    `;
    this.el.settings.querySelectorAll<HTMLButtonElement>('.toggle-row').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.key as 'music' | 'sfx' | 'narrator';
        const next = !engine.settings[key];
        engine.setSetting(key, next);
        sfx.sfxToggle(next);
      });
    });
    q(this.el.settings, '#btn-reset').addEventListener('click', () => {
      if (!window.confirm('Reset all stars, stickers and letter progress?')) return;
      this.state = resetProgression();
      this.displayedStars = 0;
      this.streak = 0;
      this.renderHud();
      sfx.sfxDrop();
      this.closeSettings();
    });
  }

  /* ---------------------------------------------------------------- */
  /*  HUD                                                              */
  /* ---------------------------------------------------------------- */

  private renderHud(): void {
    this.renderStars();
    this.el.mastery.innerHTML = SATPIN_LETTERS.map((l) => {
      const m = this.state.mastery[l];
      const item = SATPIN_ITEMS[l];
      const p = Math.min(1, m.correct / MASTERY_TARGET);
      return `<div class="chip ${p >= 1 ? 'is-mastered' : ''}" style="--accent:${item.accent};--p:${p}" title="${l}: ${m.correct}/${MASTERY_TARGET}"><span>${l}</span></div>`;
    }).join('');
    this.el.bookCount.textContent = `${this.state.unlockedStickers.length}/${ANIMAL_STICKERS.length}`;
    this.renderHint();
  }

  private renderStars(popIndex = -1): void {
    this.el.stars.querySelectorAll<HTMLElement>('.star-slot').forEach((s, i) => {
      s.classList.toggle('is-filled', i < this.displayedStars);
      if (i === popIndex) {
        s.classList.remove('pop');
        void s.offsetWidth;
        s.classList.add('pop');
      }
    });
  }

  private renderHint(): void {
    const item = SATPIN_ITEMS[this.target];
    this.el.hintBubble.classList.toggle('show', this.hint && this.started);
    this.el.hintBubble.style.setProperty('--accent', item.accent);
    this.el.hintBubble.querySelector('span')!.textContent = this.target;
    this.el.hintBtn.classList.toggle('is-on', this.hint);
    this.el.hintBtn.setAttribute('aria-pressed', String(this.hint));
  }

  private showStreak(): void {
    if (this.streak < 2) return;
    const msgs = ['', '', 'Two in a row!', 'Three in a row!', 'On fire!', 'Unstoppable!'];
    this.el.streak.textContent = `🔥 ${msgs[Math.min(this.streak, 5)] || `${this.streak} in a row!`}`;
    this.el.streak.classList.add('show');
    setTimeout(() => this.el.streak.classList.remove('show'), 1700);
  }

  /* ---------------------------------------------------------------- */
  /*  Flow                                                             */
  /* ---------------------------------------------------------------- */

  private start(): void {
    unlockAudio();
    preloadRecordings();
    sfx.sfxStart();
    startMusic();
    this.el.title.classList.add('hide');
    this.root.querySelector('.game')!.classList.remove('at-title');
    setTimeout(() => this.titleMonster.pause(true), 700);
    this.monster.setMood('happy', 1.1);
    this.fx.burst(window.innerWidth / 2, window.innerHeight * 0.6, '#2ed47a', 30);
    if (!this.started) {
      this.started = true;
      setTimeout(() => this.newRound(), 650);
    } else {
      this.locked = false;
      this.renderHint();
      setTimeout(() => this.sayTarget(), 500);
    }
  }

  private showTitle(): void {
    this.locked = true;
    stopSpeech();
    this.clearIdle();
    this.titleMonster.pause(false);
    this.el.title.classList.remove('hide');
    this.root.querySelector('.game')!.classList.add('at-title');
    this.el.hintBubble.classList.remove('show');
  }

  private newRound(): void {
    this.locked = true;
    this.wrongThisRound = 0;
    this.target = pickNextTargetLetter(this.state, this.target);
    this.choices = pickRoundChoices(this.target);
    this.renderCards();
    this.renderHint();
    setTimeout(() => {
      this.locked = false;
      this.sayTarget();
    }, 700);
  }

  private async sayTarget(): Promise<void> {
    const token = ++this.sayToken;
    this.el.listen.classList.add('is-playing');
    this.monster.setMood('speaking', 5);
    await playPhoneme(this.target);
    if (token !== this.sayToken) return;
    this.el.listen.classList.remove('is-playing');
    if (this.monster.getMood() === 'speaking') this.monster.setMood('idle');
    this.bumpIdle();
  }

  private bumpIdle(): void {
    this.clearIdle();
    if (!this.started || this.locked) return;
    this.idleTimer = window.setTimeout(() => {
      if (this.locked || this.el.title.classList.contains('hide') === false) return;
      this.el.listen.classList.remove('nudge');
      void this.el.listen.offsetWidth;
      this.el.listen.classList.add('nudge');
      this.sayTarget();
    }, 11000);
  }

  private clearIdle(): void {
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
  }

  /* ---------------------------------------------------------------- */
  /*  Cards                                                            */
  /* ---------------------------------------------------------------- */

  private renderCards(): void {
    this.el.cards.innerHTML = '';
    this.choices.forEach((letter, i) => {
      const item = SATPIN_ITEMS[letter];
      const slot = document.createElement('div');
      slot.className = 'card-slot deal';
      slot.style.setProperty('--deal-rot', `${(i - 1) * 14 - 4}deg`);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.letter = letter;
      card.style.setProperty('--accent', item.accent);
      card.style.setProperty('--accent-dark', item.accentDark);
      card.style.setProperty('--tint', item.tint);
      card.style.setProperty('--bob-delay', `${i * -0.7}s`);
      card.style.animationDelay = `${i * 0.11}s`;
      card.setAttribute('aria-label', `${letter}, ${item.word}`);
      card.innerHTML = `
        <div class="card-art"><div class="art-disc">${item.svg}</div></div>
        <div class="card-letter">${letter}</div>
        <div class="card-word"><b>${item.word[0]}</b>${item.word.slice(1)}</div>
      `;
      card.addEventListener('animationend', (e) => {
        if (e.animationName === 'deal') slot.classList.remove('deal');
      });
      slot.appendChild(card);
      this.el.cards.appendChild(slot);
      setTimeout(() => sfx.sfxDeal(i), i * 110 + 80);
      this.bindCard(card, letter, i);
    });
  }

  private bindCard(card: HTMLButtonElement, letter: SatpinLetter, index: number): void {
    card.addEventListener('pointerenter', (e) => {
      if (!this.locked && !this.drag && e.pointerType === 'mouse') sfx.sfxHover(index);
    });

    card.addEventListener('pointermove', (e) => {
      if (this.drag?.card === card) return this.onDragMove(e);
      if (e.pointerType !== 'mouse' || this.locked) return;
      const r = card.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', `${nx * 16}deg`);
      card.style.setProperty('--rx', `${-ny * 16}deg`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });

    card.addEventListener('pointerdown', (e) => {
      if (this.locked || this.drag || e.button > 0) return;
      e.preventDefault();
      unlockAudio();
      card.setPointerCapture(e.pointerId);
      const home = (card.parentElement as HTMLElement).getBoundingClientRect();
      this.drag = {
        card,
        letter,
        index,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        dx: 0,
        dy: 0,
        vx: 0,
        lastX: e.clientX,
        lastT: performance.now(),
        moved: false,
        home,
        trailAcc: 0,
      };
    });

    card.addEventListener('pointerup', (e) => this.onDragEnd(e, false));
    card.addEventListener('pointercancel', (e) => this.onDragEnd(e, true));

    // Keyboard activation
    card.addEventListener('click', (e) => {
      if (e.detail === 0 && !this.locked) this.feed(card, letter);
    });
  }

  private onDragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    d.dx = e.clientX - d.startX;
    d.dy = e.clientY - d.startY;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.vx = d.vx * 0.7 + ((e.clientX - d.lastX) / dt) * 1000 * 0.3;
    d.lastX = e.clientX;
    d.lastT = now;

    if (!d.moved && Math.hypot(d.dx, d.dy) > 8) {
      d.moved = true;
      d.card.classList.add('is-dragging');
      d.card.style.setProperty('--rx', '0deg');
      d.card.style.setProperty('--ry', '0deg');
      sfx.sfxPickup(d.index);
    }
    if (!d.moved) return;

    d.card.style.translate = `${d.dx}px ${d.dy}px`;
    d.card.style.rotate = `${clamp(d.vx * 0.012, -16, 16)}deg`;

    const cx = d.home.left + d.home.width / 2 + d.dx;
    const cy = d.home.top + d.home.height / 2 + d.dy;
    const mouth = this.monster.getMouthScreenPosition();
    const dist = Math.hypot(mouth.x - cx, mouth.y - cy);
    const range = this.monster.getUnitPx() * 4;
    this.monster.setHunger(clamp(1 - (dist - 60) / range, 0, 1), cx, cy);

    d.trailAcc += dt;
    if (d.trailAcc > 30) {
      d.trailAcc = 0;
      this.fx.trail(cx, cy, SATPIN_ITEMS[d.letter].accent);
    }
  }

  private onDragEnd(e: PointerEvent, cancelled: boolean): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    this.drag = null;
    this.monster.setHunger(0);
    if (!d.moved) {
      if (!cancelled) this.feed(d.card, d.letter);
      return;
    }
    const cx = d.home.left + d.home.width / 2 + d.dx;
    const cy = d.home.top + d.home.height / 2 + d.dy;
    const mouth = this.monster.getMouthScreenPosition();
    const dist = Math.hypot(mouth.x - cx, mouth.y - cy);
    const radius = Math.max(110, this.monster.getUnitPx() * 1.1);
    if (!cancelled && dist < radius) {
      this.feed(d.card, d.letter);
    } else {
      this.springBack(d.card);
    }
  }

  private springBack(card: HTMLButtonElement): void {
    sfx.sfxDrop();
    const from = card.style.translate || '0px 0px';
    const rot = card.style.rotate || '0deg';
    card.classList.remove('is-dragging');
    card.style.translate = '';
    card.style.rotate = '';
    card
      .animate(
        [
          { translate: from, rotate: rot, scale: '1.1' },
          { translate: '0px 0px', rotate: '0deg', scale: '1' },
        ],
        { duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
      )
      .finished.catch(() => {});
  }

  /* ---------------------------------------------------------------- */
  /*  Feeding                                                          */
  /* ---------------------------------------------------------------- */

  private async flyToMouth(card: HTMLButtonElement): Promise<{ dx: number; dy: number }> {
    const home = (card.parentElement as HTMLElement).getBoundingClientRect();
    const fromT = card.style.translate || '0px 0px';
    const fromR = card.style.rotate || '0deg';
    const fromS = card.classList.contains('is-dragging') ? '1.1' : '1';
    const [fx, fy] = fromT.split(' ').map((v) => parseFloat(v) || 0);
    card.classList.remove('is-dragging');
    card.classList.add('is-flying');
    card.style.translate = '';
    card.style.rotate = '';
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');

    const mouth = this.monster.getMouthScreenPosition();
    const dx = mouth.x - (home.left + home.width / 2);
    const dy = mouth.y - (home.top + home.height / 2);
    this.monster.setHunger(1, mouth.x, mouth.y + 40);
    sfx.sfxWhoosh(0.38);

    const midX = (fx + dx) / 2;
    const midY = Math.min(fy, dy) - 70;
    const anim = card.animate(
      [
        { translate: `${fx}px ${fy}px`, rotate: fromR, scale: fromS },
        { translate: `${midX}px ${midY}px`, rotate: '-12deg', scale: '0.85', offset: 0.5 },
        { translate: `${dx}px ${dy}px`, rotate: '25deg', scale: '0.16' },
      ],
      { duration: 430, easing: 'cubic-bezier(0.45, 0, 0.8, 0.6)', fill: 'forwards' }
    );
    await anim.finished.catch(() => {});
    return { dx, dy };
  }

  private async feed(card: HTMLButtonElement, letter: SatpinLetter): Promise<void> {
    if (this.locked) return;
    this.locked = true;
    this.clearIdle();
    this.sayToken++;
    this.el.listen.classList.remove('is-playing');
    stopSpeech();

    const isCorrect = letter === this.target;
    const result = recordAttempt(this.state, this.target, isCorrect);
    this.state = result.nextState;

    const pos = await this.flyToMouth(card);
    this.monster.setHunger(0);

    if (isCorrect) {
      await this.onCorrect(card, result.triggeredCelebration, result.unlockedSticker);
    } else {
      await this.onWrong(card, pos);
    }
  }

  private async onCorrect(card: HTMLButtonElement, celebrate: boolean, sticker: AnimalSticker | null): Promise<void> {
    const item = SATPIN_ITEMS[this.target];
    const mouth = this.monster.getMouthScreenPosition();
    card.style.opacity = '0';
    if (this.wrongThisRound === 0) this.streak++;
    else this.streak = 0;

    // Chomp chomp chomp... gulp!
    this.monster.setMood('chewing', 0.85);
    sfx.sfxMunch();
    this.shake(4);
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.fx.crumbs(mouth.x, mouth.y, item.accent, 8), i * 170);
    }
    await wait(620);
    this.monster.gulp();
    await wait(230);

    this.monster.setMood('happy', 1.8);
    sfx.sfxCorrect(this.streak);
    this.fx.burst(mouth.x, mouth.y - 20, item.accent, 34);
    this.fx.hearts(mouth.x, mouth.y - 40, 4);
    this.fx.text(mouth.x, mouth.y - this.monster.getUnitPx() * 1.6, PRAISE[Math.floor(Math.random() * PRAISE.length)], item.accent, 52);
    this.showStreak();
    this.renderHud();

    // Fade the other cards away
    this.el.cards.querySelectorAll<HTMLElement>('.card').forEach((c) => {
      if (c !== card) c.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '0.8' }], { duration: 300, fill: 'forwards', delay: 300 });
    });

    // Star flies into the meter
    const slotIndex = Math.min(this.displayedStars, ROUNDS_PER_CELEBRATION - 1);
    const slotEl = this.el.stars.querySelectorAll<HTMLElement>('.star-slot')[slotIndex];
    const sr = slotEl.getBoundingClientRect();
    const starArrived = new Promise<void>((resolve) => {
      let landed = false;
      const land = () => {
        if (landed) return;
        landed = true;
        this.displayedStars = Math.min(ROUNDS_PER_CELEBRATION, this.displayedStars + 1);
        this.renderStars(slotIndex);
        sfx.sfxStar(slotIndex);
        resolve();
      };
      setTimeout(() => {
        sfx.sfxStarFly();
        this.fx.flyStar(mouth.x, mouth.y - 30, sr.left + sr.width / 2, sr.top + sr.height / 2, land);
      }, 250);
      // Safety net: never let a paused animation frame stall the game
      setTimeout(land, 2200);
    });

    // Blend the sound into the word: "sss... snake!"
    await wait(350);
    this.monster.setMood('speaking', 4);
    await playPhoneme(this.target);
    await say(`${item.word}!`, { rate: 0.95, pitch: 1.2 });
    this.monster.setMood('happy', 0.8);
    await starArrived;

    if (celebrate && sticker) {
      await wait(500);
      this.celebrate(sticker);
    } else {
      await wait(450);
      this.newRound();
    }
  }

  private async onWrong(card: HTMLButtonElement, pos: { dx: number; dy: number }): Promise<void> {
    this.wrongThisRound++;
    this.streak = 0;
    const mouth = this.monster.getMouthScreenPosition();

    this.monster.setMood('yuck', 0.75);
    sfx.sfxWrong();
    await wait(260);
    sfx.sfxSpit();
    this.fx.crumbs(mouth.x, mouth.y, '#bfe9ff', 6);

    card.getAnimations().forEach((a) => a.cancel());
    const back = card.animate(
      [
        { translate: `${pos.dx}px ${pos.dy}px`, rotate: '25deg', scale: '0.16' },
        { translate: `${pos.dx * 0.4}px ${Math.min(pos.dy, 0) * 0.4 - 90}px`, rotate: '-200deg', scale: '1.05', offset: 0.55 },
        { translate: '0px 0px', rotate: '-360deg', scale: '1' },
      ],
      { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    await back.finished.catch(() => {});
    card.classList.remove('is-flying');
    card.classList.add('is-tried');
    card.animate([{ rotate: '0deg' }, { rotate: '-7deg' }, { rotate: '6deg' }, { rotate: '-3deg' }, { rotate: '0deg' }], {
      duration: 420,
      easing: 'ease-out',
    });

    this.monster.setMood('confused', 1.3);
    await wait(500);

    this.locked = false;
    if (this.wrongThisRound >= 2) {
      // Scaffold: glow the right card and say the keyword
      const right = this.el.cards.querySelector<HTMLElement>(`.card[data-letter="${this.target}"]`);
      right?.classList.add('is-hint');
      const token = ++this.sayToken;
      this.el.listen.classList.add('is-playing');
      this.monster.setMood('speaking', 4);
      await playPhoneme(this.target);
      if (token === this.sayToken) await say(`like ${SATPIN_ITEMS[this.target].word}`, { rate: 0.9 });
      if (token === this.sayToken) {
        this.el.listen.classList.remove('is-playing');
        this.monster.setMood('idle');
      }
      this.bumpIdle();
    } else {
      this.sayTarget();
    }
  }

  private shake(px: number): void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.el.stage.animate(
      [
        { translate: '0 0' },
        { translate: `${-px}px ${px * 0.5}px` },
        { translate: `${px}px ${-px * 0.5}px` },
        { translate: `${-px * 0.5}px 0` },
        { translate: '0 0' },
      ],
      { duration: 260, easing: 'ease-out' }
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Celebration & sticker book                                       */
  /* ---------------------------------------------------------------- */

  private stickerHtml(s: AnimalSticker, size: number): string {
    return `<div class="sticker" style="--bg:${s.bg};--ring:${s.ring};--size:${size}px"><span class="emoji">${s.emoji}</span></div>`;
  }

  private openModal(kind: string, html: string): void {
    this.el.modal.dataset.kind = kind;
    this.el.modal.innerHTML = html;
    this.el.modal.classList.add('open');
  }

  private closeModal(): void {
    this.el.modal.classList.remove('open');
    this.el.modal.dataset.kind = '';
    sfx.sfxPanel(false);
  }

  private async celebrate(sticker: AnimalSticker): Promise<void> {
    this.locked = true;
    this.monster.setMood('happy', 6);
    this.scene.celebrate(8);
    this.fx.confetti(5000);
    sfx.sfxFanfare();
    say('Amazing! You earned a sticker!', { rate: 0.95, pitch: 1.2 });

    this.openModal(
      'celebrate',
      `<div class="panel" role="dialog" aria-label="New sticker">
        <div class="ribbon">Super Star!</div>
        <div class="rays-wrap">
          <div class="rays"></div>
          <div class="reveal-card" id="reveal">
            <div class="reveal-face"><div class="mystery">?</div></div>
            <div class="reveal-face back">${this.stickerHtml(sticker, 170)}</div>
          </div>
        </div>
        <h2 id="reveal-title">A new sticker!</h2>
        <p class="tagline" id="reveal-tag" style="opacity:0">${sticker.tagline}</p>
        <button class="big-btn" id="btn-continue" type="button" style="opacity:0;pointer-events:none">Keep Playing! ${ICON.play.replace('<svg', '<svg width="26" height="26"')}</button>
      </div>`
    );

    await wait(1500);
    sfx.sfxDrumroll(1.1);
    await wait(1150);
    const reveal = this.el.modal.querySelector('#reveal');
    if (!reveal) return;
    reveal.classList.add('flipped');
    sfx.sfxCrash();
    sfx.sfxSparkle(undefined, 1.5);
    const rr = reveal.getBoundingClientRect();
    this.fx.burst(rr.left + rr.width / 2, rr.top + rr.height / 2, sticker.ring, 44);
    const title = this.el.modal.querySelector('#reveal-title');
    if (title) title.textContent = sticker.name;
    const tag = this.el.modal.querySelector<HTMLElement>('#reveal-tag');
    if (tag) tag.style.opacity = '1';
    say(`${sticker.name}!`, { pitch: 1.25 });
    this.el.bookBtn.classList.remove('bump');
    void this.el.bookBtn.offsetWidth;
    this.el.bookBtn.classList.add('bump');
    this.renderHud();

    await wait(700);
    const btn = this.el.modal.querySelector<HTMLButtonElement>('#btn-continue');
    if (!btn) return;
    btn.style.transition = 'opacity .3s';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    btn.focus({ preventScroll: true });
    btn.addEventListener('click', () => {
      sfx.sfxTap(1.2);
      this.closeModal();
      this.displayedStars = 0;
      this.renderStars();
      this.newRound();
    });
  }

  private openBook(): void {
    unlockAudio();
    sfx.sfxPanel(true);
    this.closeSettings();
    const stickers = ANIMAL_STICKERS.map((s) => {
      const have = this.state.unlockedStickers.includes(s.id);
      return `<div class="book-item">
        ${have ? this.stickerHtml(s, 96) : `<div class="locked" style="--size:96px"><span class="emoji">${s.emoji}</span></div>`}
        <span class="name">${have ? s.name : '???'}</span>
      </div>`;
    }).join('');

    const mastery = SATPIN_LETTERS.map((l) => {
      const item = SATPIN_ITEMS[l];
      const c = Math.min(MASTERY_TARGET, this.state.mastery[l].correct);
      const stars = Array.from({ length: MASTERY_TARGET }, (_, i) => `<i class="${i < c ? 'on' : ''}">★</i>`).join('');
      return `<div class="mastery-row" style="--accent:${item.accent};--tint:${item.tint}">
        <div class="letter"><span>${l}</span></div>
        <div><div class="word">${item.word}</div><div class="mini-stars">${stars}</div></div>
      </div>`;
    }).join('');

    this.openModal(
      'book',
      `<div class="panel wide" role="dialog" aria-label="Sticker book">
        <button class="icon-btn close-btn" id="btn-close-book" type="button" aria-label="Close">${ICON.close}</button>
        <div class="book-title">📒 Sticker Book</div>
        <p class="book-sub">Fill all 5 stars to win a new sticker! · ${this.state.totalRoundsWon} snacks eaten</p>
        <div class="book-grid">${stickers}</div>
        <div class="book-section">My Sounds</div>
        <div class="mastery-list">${mastery}</div>
      </div>`
    );
    q(this.el.modal, '#btn-close-book').addEventListener('click', () => this.closeModal());
  }
}

function q<T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T {
  return root.querySelector(sel) as T;
}

const app = document.getElementById('app');
if (app) {
  new PhonicsGame(app);
}
