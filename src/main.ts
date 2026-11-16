import './style.css';
import {
  ANIMAL_STICKERS,
  SATPIN_ITEMS,
  SATPIN_LETTERS,
  type AnimalSticker,
  type SatpinLetter,
} from './data/phonics';
import {
  playBoing,
  playChime,
  playFanfare,
  playPhoneme,
  playPop,
  unlockAudio,
} from './audio/soundEngine';
import {
  loadProgression,
  MASTERY_TARGET,
  pickNextTargetLetter,
  pickRoundChoices,
  recordAttempt,
  ROUNDS_PER_CELEBRATION,
  type ProgressionState,
} from './state/progression';
import { MonsterCanvasController } from './canvas/monsterCanvas';
import { ParticleCanvasController } from './canvas/particleCanvas';

class PhonicsGameApp {
  private root: HTMLElement;
  private state: ProgressionState;
  private targetLetter: SatpinLetter;
  private choices: SatpinLetter[];
  private isRoundLocked = false;
  private showLetterHint = false;
  private hasInteracted = false;

  private monster!: MonsterCanvasController;
  private particles!: ParticleCanvasController;

  // DOM references
  private cardsContainer!: HTMLElement;
  private starsContainer!: HTMLElement;
  private masteryStrip!: HTMLElement;
  private speechTextEl!: HTMLElement;
  private speechLetterBadge!: HTMLElement;
  private stickerCountBadge!: HTMLElement;
  private hintToggleBtn!: HTMLButtonElement;
  private celebrationModal!: HTMLElement;
  private stickerModal!: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = loadProgression();
    this.targetLetter = pickNextTargetLetter(this.state);
    this.choices = pickRoundChoices(this.targetLetter);

    this.renderShell();
    this.setupCanvases();
    this.renderHud();
    this.renderCards();
    this.bindGlobalEvents();
  }

  private renderShell(): void {
    this.root.innerHTML = `
      <div class="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100">
        <!-- Decorative soft background clouds & hills -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <div class="absolute -left-12 top-10 h-28 w-56 rounded-full bg-white/60 blur-[1px]"></div>
          <div class="absolute right-8 top-16 h-24 w-48 rounded-full bg-white/55 blur-[1px]"></div>
          <div class="absolute -bottom-24 -left-16 h-56 w-[65vw] rounded-[100%] bg-emerald-200/70"></div>
          <div class="absolute -bottom-28 -right-16 h-60 w-[60vw] rounded-[100%] bg-teal-200/60"></div>
        </div>

        <!-- Particle & Confetti Overlay Canvas -->
        <canvas id="particle-canvas" class="pointer-events-none fixed inset-0 z-40 h-full w-full"></canvas>

        <!-- Top HUD -->
        <header class="relative z-20 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pt-3 sm:px-6 sm:pt-4">
          <div class="flex items-center gap-2.5 rounded-2xl bg-white/85 px-3.5 py-2 shadow-sm ring-2 ring-white backdrop-blur-sm">
            <span class="text-2xl" aria-hidden="true">👾</span>
            <div>
              <h1 class="font-display text-base font-bold leading-tight text-teal-800 sm:text-lg">
                Munchy's Phonics
              </h1>
              <div id="mastery-strip" class="mt-0.5 flex items-center gap-1"></div>
            </div>
          </div>

          <!-- 5-Round Star Meter -->
          <div class="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-sm ring-2 ring-amber-200 backdrop-blur-sm">
            <span class="hidden text-xs font-extrabold uppercase tracking-wider text-amber-600 sm:inline">
              Sticker Goal
            </span>
            <div id="stars-container" class="flex items-center gap-1.5"></div>
          </div>

          <!-- Controls: Hint & Sticker Book -->
          <div class="flex items-center gap-2">
            <button
              id="hint-toggle-btn"
              type="button"
              class="phonics-card flex items-center gap-1.5 rounded-2xl bg-white/90 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm ring-2 ring-slate-200 sm:text-sm"
              title="Show or hide the target letter in Munchy's speech bubble"
            >
              <span>👀</span>
              <span class="hidden sm:inline">Hint</span>
            </button>

            <button
              id="open-stickers-btn"
              type="button"
              class="phonics-card flex items-center gap-1.5 rounded-2xl bg-amber-300 px-3.5 py-2 text-xs font-extrabold text-amber-950 shadow-[0_4px_0_#d97706] ring-2 ring-amber-400 sm:text-sm"
            >
              <span>🦁</span>
              <span>Stickers</span>
              <span
                id="sticker-count-badge"
                class="rounded-full bg-white/90 px-2 py-0.5 text-xs font-black text-amber-800"
              >0/${ANIMAL_STICKERS.length}</span>
            </button>
          </div>
        </header>

        <!-- Main Stage: Monster (Left) + 3 Bouncy Cards (Right) -->
        <main class="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-4 px-4 pb-4 pt-2 md:grid-cols-12 md:gap-6 md:px-6">
          <!-- Left: Monster + Speech Bubble -->
          <section class="relative flex h-full max-h-[38vh] flex-col items-center justify-end md:col-span-5 md:max-h-[76vh]">
            <!-- Speech Bubble -->
            <button
              id="speak-again-btn"
              type="button"
              class="phonics-card animate-gentle-float group relative z-20 mb-1 flex items-center gap-3 rounded-3xl bg-white px-5 py-3 shadow-[0_6px_0_#cbd5e1] ring-4 ring-sky-200 focus:outline-none"
              aria-label="Hear the sound again"
            >
              <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-2xl text-white shadow-inner transition-transform group-hover:scale-110">
                🔊
              </span>
              <div class="text-left">
                <p id="speech-text" class="font-display text-lg font-bold text-slate-800 sm:text-xl">
                  Tap to hear!
                </p>
                <p class="text-xs font-bold text-sky-600">
                  Feed Munchy the matching sound
                </p>
              </div>
              <span
                id="speech-letter-badge"
                class="font-display hidden h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-bold text-amber-700 ring-2 ring-amber-300"
              ></span>
              <!-- Speech bubble tail -->
              <span class="absolute -bottom-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 bg-white ring-b-4 ring-r-4 ring-sky-200"></span>
            </button>

            <!-- Monster Canvas -->
            <div
              id="monster-wrapper"
              class="relative flex w-full flex-1 cursor-pointer items-center justify-center"
              title="Tap Munchy to hear the sound again"
            >
              <canvas id="monster-canvas" class="h-full w-full max-w-[380px]"></canvas>
            </div>
          </section>

          <!-- Right: 3 Bouncy Phonics Cards -->
          <section class="flex h-full items-center justify-center md:col-span-7">
            <div
              id="cards-container"
              class="grid w-full max-w-2xl grid-cols-3 gap-3 sm:gap-5"
            ></div>
          </section>
        </main>

        <!-- 5-Round Celebration & Sticker Unlock Modal -->
        <div
          id="celebration-modal"
          class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
        ></div>

        <!-- Collectible Sticker Book & Mastery Modal -->
        <div
          id="sticker-modal"
          class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
        ></div>
      </div>
    `;

    this.cardsContainer = this.root.querySelector('#cards-container')!;
    this.starsContainer = this.root.querySelector('#stars-container')!;
    this.masteryStrip = this.root.querySelector('#mastery-strip')!;
    this.speechTextEl = this.root.querySelector('#speech-text')!;
    this.speechLetterBadge = this.root.querySelector('#speech-letter-badge')!;
    this.stickerCountBadge = this.root.querySelector('#sticker-count-badge')!;
    this.hintToggleBtn = this.root.querySelector('#hint-toggle-btn')!;
    this.celebrationModal = this.root.querySelector('#celebration-modal')!;
    this.stickerModal = this.root.querySelector('#sticker-modal')!;
  }

  private setupCanvases(): void {
    const monsterCanvas = this.root.querySelector('#monster-canvas') as HTMLCanvasElement;
    const particleCanvas = this.root.querySelector('#particle-canvas') as HTMLCanvasElement;
    this.monster = new MonsterCanvasController(monsterCanvas);
    this.particles = new ParticleCanvasController(particleCanvas);
  }

  private bindGlobalEvents(): void {
    const speakBtn = this.root.querySelector('#speak-again-btn') as HTMLButtonElement;
    const monsterWrapper = this.root.querySelector('#monster-wrapper') as HTMLElement;
    const openStickersBtn = this.root.querySelector('#open-stickers-btn') as HTMLButtonElement;

    const handleSpeak = () => {
      unlockAudio();
      this.hasInteracted = true;
      playPop(1.1);
      this.speakTargetPhoneme();
    };

    speakBtn.addEventListener('click', handleSpeak);
    monsterWrapper.addEventListener('click', handleSpeak);

    this.hintToggleBtn.addEventListener('click', () => {
      unlockAudio();
      playPop(1.2);
      this.showLetterHint = !this.showLetterHint;
      this.renderHud();
    });

    openStickersBtn.addEventListener('click', () => {
      unlockAudio();
      playPop(1.15);
      this.openStickerBook();
    });

    // Unlock audio on first pointer interaction anywhere
    const firstUnlock = () => {
      unlockAudio();
      if (!this.hasInteracted) {
        this.hasInteracted = true;
        this.speakTargetPhoneme();
      }
      window.removeEventListener('pointerdown', firstUnlock);
    };
    window.addEventListener('pointerdown', firstUnlock, { once: true });
  }

  private speakTargetPhoneme(): void {
    this.speechTextEl.textContent = 'Find this sound!';
    playPhoneme(
      this.targetLetter,
      () => this.monster.setMood('speaking', 1.0),
      () => {
        if (!this.isRoundLocked) {
          this.monster.setMood('idle');
        }
      }
    );
  }

  private renderHud(): void {
    // 5-Star progress meter
    this.starsContainer.innerHTML = '';
    for (let i = 0; i < ROUNDS_PER_CELEBRATION; i++) {
      const filled = i < this.state.roundProgress;
      const star = document.createElement('span');
      star.className = `text-xl sm:text-2xl transition-transform ${
        filled ? 'animate-star-pop scale-110' : 'opacity-30 grayscale'
      }`;
      star.textContent = '⭐';
      this.starsContainer.appendChild(star);
    }

    // SATPIN mini mastery strip
    this.masteryStrip.innerHTML = SATPIN_LETTERS.map((letter) => {
      const m = this.state.mastery[letter];
      const mastered = m.correct >= MASTERY_TARGET;
      return `
        <span
          class="inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-black uppercase ${
            mastered
              ? 'bg-emerald-500 text-white shadow-xs'
              : m.correct > 0
                ? 'bg-amber-200 text-amber-900'
                : 'bg-slate-200/80 text-slate-500'
          }"
          title="${letter}: ${m.correct}/${MASTERY_TARGET} correct"
        >${letter}</span>
      `;
    }).join('');

    // Sticker count
    this.stickerCountBadge.textContent = `${this.state.unlockedStickers.length}/${ANIMAL_STICKERS.length}`;

    // Hint badge in speech bubble
    if (this.showLetterHint) {
      this.speechLetterBadge.textContent = this.targetLetter;
      this.speechLetterBadge.classList.remove('hidden');
      this.speechLetterBadge.classList.add('flex');
      this.hintToggleBtn.classList.add('ring-amber-400', 'bg-amber-100');
    } else {
      this.speechLetterBadge.classList.add('hidden');
      this.speechLetterBadge.classList.remove('flex');
      this.hintToggleBtn.classList.remove('ring-amber-400', 'bg-amber-100');
    }
  }

  private renderCards(): void {
    this.cardsContainer.innerHTML = '';

    this.choices.forEach((letter, idx) => {
      const item = SATPIN_ITEMS[letter];
      const card = document.createElement('button');
      card.type = 'button';
      card.style.animationDelay = `${idx * 70}ms`;
      card.className = `phonics-card animate-card-enter group relative flex flex-col items-center justify-between rounded-3xl border-4 p-3 sm:p-5 ${item.cardBg} ${item.cardBorder} ${item.cardShadow} focus:outline-none`;
      card.setAttribute('aria-label', `${item.letter} for ${item.word}`);

      card.innerHTML = `
        <div class="aspect-square w-full max-w-[115px] p-1 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3">
          ${item.svg}
        </div>
        <div class="mt-1 flex flex-col items-center">
          <span class="font-display text-5xl font-bold leading-none sm:text-6xl ${item.letterColor}">
            ${item.letter}
          </span>
          <span class="mt-1 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-slate-600 sm:text-sm">
            <span class="${item.letterColor} font-black">${item.word[0]}</span>${item.word.slice(1)}
          </span>
        </div>
      `;

      card.addEventListener('pointerenter', () => {
        if (!this.isRoundLocked) {
          playPop(0.95 + idx * 0.1);
        }
      });

      card.addEventListener('click', () => {
        this.handleCardClick(letter, card);
      });

      this.cardsContainer.appendChild(card);
    });
  }

  private handleCardClick(letter: SatpinLetter, cardEl: HTMLButtonElement): void {
    if (this.isRoundLocked) return;
    unlockAudio();
    this.hasInteracted = true;

    const isCorrect = letter === this.targetLetter;
    const { nextState, triggeredCelebration, unlockedSticker } = recordAttempt(
      this.state,
      this.targetLetter,
      isCorrect
    );
    this.state = nextState;

    if (isCorrect) {
      this.isRoundLocked = true;
      this.handleCorrectMatch(letter, cardEl, triggeredCelebration, unlockedSticker);
    } else {
      this.handleWrongMatch(cardEl);
    }
  }

  private handleCorrectMatch(
    letter: SatpinLetter,
    cardEl: HTMLButtonElement,
    triggeredCelebration: boolean,
    unlockedSticker: AnimalSticker | null
  ): void {
    const item = SATPIN_ITEMS[letter];
    const cardRect = cardEl.getBoundingClientRect();
    const mouth = this.monster.getMouthScreenPosition();

    // Particle burst at the card
    this.particles.burst(
      cardRect.left + cardRect.width / 2,
      cardRect.top + cardRect.height / 2,
      item.accentHex,
      28
    );

    playChime();
    this.monster.setMood('happy', 1.3);
    this.speechTextEl.textContent = `Yum! "${item.letter}" for ${item.word}!`;

    // Fly card into Munchy's mouth
    const dx = mouth.x - (cardRect.left + cardRect.width / 2);
    const dy = mouth.y - (cardRect.top + cardRect.height / 2);

    const flyAnim = cardEl.animate(
      [
        { transform: 'translate(0, 0) scale(1.08, 0.92) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 40}px) scale(0.9, 1.1) rotate(-8deg)`,
          opacity: 1,
          offset: 0.45,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(0.15, 0.15) rotate(16deg)`, opacity: 0 },
      ],
      {
        duration: 520,
        easing: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
        fill: 'forwards',
      }
    );

    flyAnim.onfinish = () => {
      // Second celebratory burst at Munchy's mouth!
      this.particles.burst(mouth.x, mouth.y, item.accentHex, 36);
      this.renderHud();

      if (triggeredCelebration && unlockedSticker) {
        this.triggerFiveRoundCelebration(unlockedSticker);
      } else {
        setTimeout(() => {
          this.startNextRound();
        }, 850);
      }
    };
  }

  private handleWrongMatch(cardEl: HTMLButtonElement): void {
    const cardRect = cardEl.getBoundingClientRect();
    const mouth = this.monster.getMouthScreenPosition();
    const dx = mouth.x - (cardRect.left + cardRect.width / 2);
    const dy = mouth.y - (cardRect.top + cardRect.height / 2);

    cardEl.style.setProperty('--spit-dx', `${dx}px`);
    cardEl.style.setProperty('--spit-dy', `${dy}px`);

    // Restart spit-out animation cleanly
    cardEl.classList.remove('animate-card-enter', 'animate-spit-out');
    void cardEl.offsetWidth;
    cardEl.classList.add('animate-spit-out');

    playBoing();
    this.monster.setMood('spitOut', 0.85);
    this.speechTextEl.textContent = 'Oops! Try another one!';

    // Gently replay the target sound after the playful bounce
    setTimeout(() => {
      if (!this.isRoundLocked) {
        this.speakTargetPhoneme();
      }
    }, 750);
  }

  private startNextRound(): void {
    this.isRoundLocked = false;
    this.targetLetter = pickNextTargetLetter(this.state, this.targetLetter);
    this.choices = pickRoundChoices(this.targetLetter);
    this.renderCards();
    this.renderHud();
    if (this.hasInteracted) {
      this.speakTargetPhoneme();
    }
  }

  private triggerFiveRoundCelebration(sticker: AnimalSticker): void {
    // 5-second confetti celebration!
    this.particles.startConfetti(5000);
    playFanfare();
    this.monster.setMood('happy', 5.0);

    this.celebrationModal.innerHTML = `
      <div class="animate-modal-in relative w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl ring-8 ring-amber-300 sm:p-8">
        <div class="text-sm font-black uppercase tracking-widest text-amber-500">
          🎉 5 Rounds Complete! 🎉
        </div>
        <h2 class="font-display mt-1 text-3xl font-bold text-slate-800 sm:text-4xl">
          Sticker Unlocked!
        </h2>

        <div class="mx-auto my-6 flex h-36 w-36 items-center justify-center rounded-3xl border-4 ${sticker.bgClass} shadow-inner">
          <span class="animate-gentle-float text-7xl sm:text-8xl">${sticker.emoji}</span>
        </div>

        <h3 class="font-display text-2xl font-bold text-teal-700">${sticker.name}</h3>
        <p class="mt-1 text-sm font-bold text-slate-500">${sticker.tagline}</p>

        <button
          id="celebration-continue-btn"
          type="button"
          class="phonics-card mt-6 w-full rounded-2xl bg-emerald-500 px-6 py-4 font-display text-xl font-bold text-white shadow-[0_6px_0_#059669] hover:bg-emerald-400"
        >
          Keep Playing! 🚀
        </button>
      </div>
    `;

    this.celebrationModal.classList.remove('hidden');
    this.celebrationModal.classList.add('flex');

    const continueBtn = this.celebrationModal.querySelector(
      '#celebration-continue-btn'
    ) as HTMLButtonElement;
    continueBtn.addEventListener('click', () => {
      playPop(1.2);
      this.celebrationModal.classList.add('hidden');
      this.celebrationModal.classList.remove('flex');
      this.startNextRound();
    });
  }

  private openStickerBook(): void {
    const stickerGrid = ANIMAL_STICKERS.map((sticker) => {
      const unlocked = this.state.unlockedStickers.includes(sticker.id);
      return `
        <div class="flex flex-col items-center rounded-2xl border-3 p-3 text-center ${
          unlocked
            ? `${sticker.bgClass} shadow-sm`
            : 'border-slate-200 bg-slate-100/80 opacity-60'
        }">
          <span class="text-4xl sm:text-5xl ${unlocked ? '' : 'brightness-0 opacity-25'}">
            ${sticker.emoji}
          </span>
          <span class="mt-1.5 text-xs font-extrabold text-slate-700">
            ${unlocked ? sticker.name : 'Locked'}
          </span>
        </div>
      `;
    }).join('');

    const masteryGrid = SATPIN_LETTERS.map((letter) => {
      const m = this.state.mastery[letter];
      const pct = Math.min(100, Math.round((m.correct / MASTERY_TARGET) * 100));
      const item = SATPIN_ITEMS[letter];
      return `
        <div class="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
          <span class="font-display flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xl font-bold shadow-xs ${item.letterColor}">
            ${letter}
          </span>
          <div class="flex-1">
            <div class="flex justify-between text-xs font-extrabold text-slate-600">
              <span>${item.word}</span>
              <span>${m.correct}/${MASTERY_TARGET} ⭐</span>
            </div>
            <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                class="h-full rounded-full transition-all"
                style="width: ${pct}%; background-color: ${item.accentHex}"
              ></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.stickerModal.innerHTML = `
      <div class="animate-modal-in relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl ring-8 ring-sky-200 sm:p-7">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-2xl font-bold text-slate-800 sm:text-3xl">
            🦁 Sticker Book
          </h2>
          <button
            id="close-stickers-btn"
            type="button"
            class="phonics-card flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-600 hover:bg-slate-200"
            aria-label="Close sticker book"
          >✕</button>
        </div>

        <p class="mt-1 text-sm font-bold text-slate-500">
          Win 5 rounds to unlock a new animal sticker! (${this.state.totalRoundsWon} total rounds won)
        </p>

        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          ${stickerGrid}
        </div>

        <h3 class="font-display mt-6 text-lg font-bold text-slate-700">
          SATPIN Letter Mastery
        </h3>
        <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          ${masteryGrid}
        </div>
      </div>
    `;

    this.stickerModal.classList.remove('hidden');
    this.stickerModal.classList.add('flex');

    const closeBtn = this.stickerModal.querySelector('#close-stickers-btn') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => {
      playPop(0.9);
      this.stickerModal.classList.add('hidden');
      this.stickerModal.classList.remove('flex');
    });

    this.stickerModal.addEventListener(
      'click',
      (e) => {
        if (e.target === this.stickerModal) {
          this.stickerModal.classList.add('hidden');
          this.stickerModal.classList.remove('flex');
        }
      },
      { once: true }
    );
  }
}

const appRoot = document.getElementById('app');
if (appRoot) {
  new PhonicsGameApp(appRoot);
}
