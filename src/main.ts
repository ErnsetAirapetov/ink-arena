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
import { createCombatant, damageFor, applyDamage, respawn } from './combat/combat';
import { CombatScene } from './combat/scene';

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
const scene = new CombatScene();
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
  hud.showCast(outcome);

  // --- combat: нанести урон манекену ---
  if (outcome.kind !== 'fizzle' && dummy.alive) {
    const dmg = damageFor(outcome.power);
    dummy = applyDamage(dummy, dmg);
    scene.hit(dmg);
    effects.burst(scene.target.x, scene.target.y, colorFor(outcome.id), outcome.power);
    if (!dummy.alive) respawnAt = performance.now() + CONFIG.combat.respawnMs;
  }
  // --- /combat ---

  strokes.length = 0; // очистить буфер и холст
}

let last = performance.now();
function loop(now: number): void {
  const dt = now - last;
  last = now;

  // --- combat: авто-респавн манекена ---
  if (respawnAt !== null && now >= respawnAt) {
    dummy = respawn(dummy);
    respawnAt = null;
  }
  // --- /combat ---

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  guide.draw(ctx, { w: canvas.width, h: canvas.height });
  scene.update(dt);
  scene.draw(ctx, dummy, { w: canvas.width, h: canvas.height });
  effects.update(dt);
  effects.draw(ctx);
  for (const s of strokes) drawInk(ctx, s.points);
  if (recorder.isDrawing) drawInk(ctx, recorder.current);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
