import { StrokeRecorder } from './drawing/stroke';
import { drawInk } from './drawing/canvas-renderer';
import { recognize } from './recognition/recognizer';
import { GLYPHS } from './recognition/glyphs';
import { buildSpell } from './spells/spell-system';
import { ComboTracker } from './spells/combo';
import { EffectSystem, colorFor } from './effects/effects';
import { Hud } from './ui/hud';

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
const combo = new ComboTracker();
const effects = new EffectSystem();

function center(points: readonly { x: number; y: number }[]): { x: number; y: number } {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return { x: x / points.length, y: y / points.length };
}

canvas.addEventListener('pointerdown', (e) => {
  recorder.start(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointermove', (e) => {
  if (recorder.isDrawing) recorder.add(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointerup', (e) => {
  if (!recorder.isDrawing) return;
  const pts = [...recorder.current];
  const stroke = recorder.finish();
  const match = recognize(stroke.points, GLYPHS);
  if (!match) return;

  const spell = buildSpell(match, stroke.duration);
  const at = center(pts);

  if (!spell.success) {
    hud.showSpell(spell);
    return;
  }

  const result = combo.push(spell.elementId, e.timeStamp);
  if (result.type === 'combo') {
    hud.showCombo(result.combo.name, spell.power);
    effects.burst(at.x, at.y, colorFor(result.combo.id), Math.min(100, spell.power + 20));
  } else {
    hud.showSpell(spell);
    effects.burst(at.x, at.y, colorFor(spell.elementId), spell.power);
  }
});

let last = performance.now();
function loop(now: number): void {
  const dt = now - last;
  last = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  effects.update(dt);
  effects.draw(ctx);
  if (recorder.isDrawing) drawInk(ctx, recorder.current);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
