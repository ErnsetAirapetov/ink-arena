import { StrokeRecorder, type Stroke } from './drawing/stroke';
import { drawInk } from './drawing/canvas-renderer';
import { recognize, type MatchResult } from './recognition/recognizer';
import { GLYPHS } from './recognition/glyphs';
import { clusterStrokes } from './recognition/clustering';
import { resolveCast } from './spells/cast';
import { EffectSystem, colorFor } from './effects/effects';
import { Hud } from './ui/hud';
import { CONFIG } from './config';
import { boundingBox } from './geometry';

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
const strokes: Stroke[] = []; // буфер завершённых линий до каста

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

  if (outcome.kind !== 'fizzle') {
    const all = strokes.flatMap((s) => s.points);
    const box = boundingBox(all);
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    effects.burst(cx, cy, colorFor(outcome.id), outcome.power);
  }

  strokes.length = 0; // очистить буфер и холст
}

let last = performance.now();
function loop(now: number): void {
  const dt = now - last;
  last = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  effects.update(dt);
  effects.draw(ctx);
  for (const s of strokes) drawInk(ctx, s.points);
  if (recorder.isDrawing) drawInk(ctx, recorder.current);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
