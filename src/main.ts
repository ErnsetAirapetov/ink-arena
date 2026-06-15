import { StrokeRecorder, type Stroke } from './drawing/stroke';
import { drawInk } from './drawing/canvas-renderer';
import { recognize, type MatchResult } from './recognition/recognizer';
import { GLYPHS } from './recognition/glyphs';
import { clusterStrokes } from './recognition/clustering';
import { resolveCast } from './spells/cast';
import { EffectSystem, colorFor } from './effects/effects';
import { Hud } from './ui/hud';
import { GuideOverlay } from './ui/guide';
import { CONFIG } from './config';
import { boundingBox } from './geometry';
import { createCombatant, applyDamage, respawn, sizeFactor, damageFor, flightTimeMs } from './combat/combat';
import { createPlayer, castShield, tickPlayer } from './combat/player';
import { CombatScene } from './combat/scene';
import { ProjectileSystem } from './combat/projectile';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const hud = new Hud(document.getElementById('hud')!);

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const recorder = new StrokeRecorder();
const effects = new EffectSystem();
const guide = new GuideOverlay();
const strokes: Stroke[] = []; // буфер завершённых линий до каста

// --- combat ---
let dummy = createCombatant(CONFIG.combat.dummyHp);
let player = createPlayer();
const scene = new CombatScene();
const projectiles = new ProjectileSystem();
let respawnAt: number | null = null;
// --- /combat ---

canvas.addEventListener('pointerdown', (e) => {
  recorder.start(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointermove', (e) => {
  if (recorder.isDrawing) recorder.add(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointerup', () => {
  if (recorder.isDrawing) strokes.push(recorder.finish());
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    cast();
  }
  if (e.code === 'KeyG') {
    guide.toggle();
  }
});

function cast(): void {
  const groups = clusterStrokes(strokes, CONFIG.clusterGapPx);
  const results: MatchResult[] = [];
  for (const group of groups) {
    const points = group.flatMap((s) => s.points);
    const match = recognize(points, GLYPHS);
    if (match) results.push(match);
  }

  const outcome = resolveCast(results);

  if (outcome.kind === 'fizzle') {
    hud.showCast(outcome);
    strokes.length = 0;
    return;
  }

  // размер заклинания — макс. сторона bbox всех точек
  const all = strokes.flatMap((s) => s.points);
  const box = boundingBox(all);
  const spellSizePx = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  const sf = sizeFactor(spellSizePx);
  const accuracy = outcome.power / 100;

  // щит (одиночный) — самобаф, без снаряда
  if (outcome.kind === 'single' && outcome.id === 'shield') {
    player = castShield(player, CONFIG.combat.shieldMs);
    hud.showShield(CONFIG.combat.shieldMs);
    strokes.length = 0;
    return;
  }

  // атака — снаряд в манекен
  const damage = damageFor(sf, accuracy);
  const flightMs = flightTimeMs(sf);
  projectiles.spawn({
    from: scene.origin,
    to: scene.target,
    flightMs,
    damage,
    colorId: outcome.id,
  });
  hud.showAttack(outcome, sf, damage, flightMs);

  strokes.length = 0; // очистить буфер и холст
}

let last = performance.now();
function loop(now: number): void {
  const dt = now - last;
  last = now;

  // авто-респавн манекена
  if (respawnAt !== null && now >= respawnAt) {
    dummy = respawn(dummy);
    respawnAt = null;
  }

  // тик щита
  player = tickPlayer(player, dt);

  // продвинуть снаряды; на каждый прилёт — урон по манекену
  for (const a of projectiles.update(dt)) {
    if (dummy.alive) {
      dummy = applyDamage(dummy, a.damage);
      scene.hit(a.damage);
      effects.burst(a.x, a.y, colorFor(a.colorId), Math.min(100, a.damage + 20));
      if (!dummy.alive) respawnAt = now + CONFIG.combat.respawnMs;
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  guide.draw(ctx, { w: canvas.width, h: canvas.height });
  scene.update(dt);
  scene.draw(ctx, dummy, player, { w: canvas.width, h: canvas.height });
  projectiles.draw(ctx);
  effects.update(dt);
  effects.draw(ctx);
  for (const s of strokes) drawInk(ctx, s.points);
  if (recorder.isDrawing) drawInk(ctx, recorder.current);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
