// Оркестратор клиента: единственная петля игры. sim — единственный источник
// истины (docs/tech/architecture.md «client: тонкий слой»); клиент собирает
// штрихи, гоняет фиксированный тик step() и рисует состояние/события. Игровых
// правил здесь нет — только ввод, тайминг рендера и отрисовка.
//
// Конвейер каста внутри клиента ровно как в архитектуре: штрихи блокнота →
// recognition/spellcraft (parseComposition) → CastOutcome → вход тика sim.
// Визуальный модуль — проверяется руками (см. сценарий в PR).
import {
  config,
  createMatch,
  isClosingCircle,
  parseComposition,
  recognizeGlyph,
  step,
  type CastOutcome,
  type SimEvent,
  type SimState,
} from '@inkarena/core';
import { clientConfig } from './config';
import { castFeedback, type FeedbackTone } from './feedback';
import { computeLayout, type Layout, type Vec2 } from './layout';
import { ticksToRun } from './loop';
import { flightProgress, lerpPoint } from './projectile';
import { attachPointerInput } from './input/pointer';
import { drawArena } from './render/arena';
import { drawHud } from './render/hud';
import { drawNotebook } from './render/notebook';
import {
  drawFeedbackBanner,
  drawResultScreen,
  drawRoundBanner,
  drawStartScreen,
} from './render/screens';
import type { DrawnStroke, HitFlash, RenderProjectile } from './render/types';

type Screen = 'start' | 'battle' | 'result';

interface LaunchInfo {
  from: Vec2;
  to: Vec2;
  total: number;
  element: RenderProjectile['element'];
  owner: RenderProjectile['owner'];
}

interface Banner {
  text: string;
  tone: FeedbackTone;
  until: number;
}

const TICK_MS = 1000 / config.sim.tickRate;

export function startGame(canvas: HTMLCanvasElement): void {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('2D-контекст канваса недоступен');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let dpr = 1;
  let layout: Layout = computeLayout(window.innerWidth, window.innerHeight);
  let screen: Screen = 'start';
  let state: SimState | null = null;
  let matchWinnerIsPlayer = false;

  // Ввод и рисование.
  const strokes: DrawnStroke[] = [];
  let liveStroke: Vec2[] | null = null;
  let pendingCast: CastOutcome | null = null;

  // Визуальные эффекты (нарастают/гаснут по времени рендера, вне состояния sim).
  const launchInfo = new Map<number, LaunchInfo>();
  let hitFlashes: HitFlash[] = [];
  let feedback: Banner | null = null;
  let roundBanner: { text: string; until: number } | null = null;

  // Тайминг фиксированного тика.
  let accumulatorMs = 0;
  let lastTime = performance.now();

  function resize(): void {
    dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    layout = computeLayout(w, h);
  }

  function startMatch(): void {
    state = createMatch(); // bo3, маг 0 — игрок, маг 1 — бот-манекен
    screen = 'battle';
    strokes.length = 0;
    liveStroke = null;
    pendingCast = null;
    launchInfo.clear();
    hitFlashes = [];
    feedback = null;
    roundBanner = null;
    accumulatorMs = 0;
    lastTime = performance.now();
  }

  // --- Ввод: сбор штрихов, запуск каста замыкающим кругом ---

  attachPointerInput({
    canvas,
    getLayout: () => layout,
    isActive: () => screen === 'battle',
    callbacks: {
      onStrokeStart: (p) => {
        liveStroke = [p];
      },
      onStrokePoint: (p) => {
        if (liveStroke) liveStroke.push(p);
      },
      onStrokeEnd: () => {
        const pts = liveStroke;
        liveStroke = null;
        if (!pts || pts.length < 2) return; // тап/мусор — не штрих
        const now = performance.now();
        if (isClosingCircle(pts)) {
          triggerCast(pts, now);
        } else {
          // Вспышка «распознан» (Р31): контур подсвечивается, если глиф валиден.
          const recognized = recognizeGlyph(pts) !== null;
          strokes.push({
            points: pts,
            recognizedUntil: recognized ? now + clientConfig.timings.recognizedFlashMs : 0,
          });
        }
      },
    },
  });

  // Замыкающий круг завершил композицию: разбор в core и подача в тик sim.
  function triggerCast(circlePts: Vec2[], now: number): void {
    const composition = strokes.map((s) => s.points).concat([circlePts]);
    const outcome = parseComposition(composition);
    pendingCast = outcome; // применится ближайшим тиком (not-sent — no-op в step)
    const fb = castFeedback(outcome);
    feedback = { text: fb.message, tone: fb.tone, until: now + clientConfig.timings.feedbackMs };
    // Холст очищается — без штрафа сверх сгоревших чернил (Р29).
    strokes.length = 0;
  }

  // Переходы экранов: тап на старте/результате начинает (пере)игру. Слушатель
  // добавлен ПОСЛЕ attachPointerInput, поэтому стартовый тап не рисует штрих
  // (в тот момент screen ещё не 'battle').
  canvas.addEventListener('pointerdown', () => {
    if (screen === 'start' || screen === 'result') startMatch();
  });

  // --- События тика в визуальные эффекты ---

  function processEvents(events: readonly SimEvent[], now: number): void {
    for (const e of events) {
      switch (e.type) {
        case 'projectile-launched': {
          const opponent = (e.mage === 0 ? 1 : 0) as RenderProjectile['owner'];
          launchInfo.set(e.projectileId, {
            from: layout.mages[e.mage],
            to: layout.mages[opponent],
            total: e.flightTicks,
            element: e.element,
            owner: e.mage,
          });
          break;
        }
        case 'hit': {
          hitFlashes.push({ mage: e.mage, until: now + clientConfig.timings.hitFlashMs });
          launchInfo.delete(e.projectileId);
          break;
        }
        case 'round-end': {
          const text =
            e.winner === null
              ? `Раунд ${e.round + 1}: ничья`
              : e.winner === 0
                ? `Раунд ${e.round + 1}: победа`
                : `Раунд ${e.round + 1}: поражение`;
          const intermissionMs = (state!.match.rules.intermissionTicks / config.sim.tickRate) * 1000;
          const hold = Math.max(clientConfig.timings.roundBannerMinMs, intermissionMs);
          roundBanner = { text, until: now + hold };
          launchInfo.clear();
          break;
        }
        case 'round-start': {
          launchInfo.clear();
          hitFlashes = [];
          break;
        }
        case 'match-end': {
          matchWinnerIsPlayer = e.winner === 0;
          screen = 'result';
          break;
        }
        default:
          break; // cast/misfire/heal/shield/cast-failed/sudden-death — не рисуем отдельно
      }
    }
  }

  // --- Петля ---

  function advanceSim(dt: number, now: number): number {
    accumulatorMs += dt;
    const plan = ticksToRun(accumulatorMs, TICK_MS);
    accumulatorMs = plan.remainder;

    let cast: CastOutcome | null = null;
    if (plan.ticks > 0) {
      cast = pendingCast;
      pendingCast = null;
    }
    for (let i = 0; i < plan.ticks; i++) {
      const inputs = [{ cast: i === 0 ? cast : null }, { cast: null }] as const;
      const res = step(state!, inputs);
      state = res.state;
      processEvents(res.events, now);
    }
    // alpha — под-тиковая дробь для плавной интерполяции снарядов.
    return plan.remainder / TICK_MS;
  }

  function collectProjectiles(alpha: number): RenderProjectile[] {
    const out: RenderProjectile[] = [];
    if (!state) return out;
    for (const p of state.projectiles) {
      const info = launchInfo.get(p.id);
      if (!info) continue;
      const progress = flightProgress(info.total, p.remainingFlightTicks, alpha);
      out.push({ pos: lerpPoint(info.from, info.to, progress), element: p.element, owner: p.owner });
    }
    return out;
  }

  function renderScene(now: number, alpha: number): void {
    if (!state) return;
    hitFlashes = hitFlashes.filter((h) => h.until > now);
    const projectiles = collectProjectiles(alpha);
    drawArena(ctx, layout, state, projectiles, hitFlashes, now);
    drawNotebook(ctx, layout, strokes, liveStroke, now);
    drawHud(ctx, layout, state);
    if (feedback && now < feedback.until) {
      const a = (feedback.until - now) / clientConfig.timings.feedbackMs;
      drawFeedbackBanner(ctx, layout, feedback.text, feedback.tone, a);
    }
    if (roundBanner && now < roundBanner.until) {
      drawRoundBanner(ctx, layout, roundBanner.text, 1);
    }
  }

  function frame(now: number): void {
    const dt = now - lastTime;
    lastTime = now;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, layout.width, layout.height);
    ctx.fillStyle = clientConfig.colors.bg;
    ctx.fillRect(0, 0, layout.width, layout.height);

    if (screen === 'start') {
      drawStartScreen(ctx, layout);
    } else {
      const alpha = screen === 'battle' ? advanceSim(dt, now) : 0;
      renderScene(now, alpha);
      if (screen === 'result') {
        drawResultScreen(ctx, layout, matchWinnerIsPlayer, state!.match.wins);
      }
    }

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}
