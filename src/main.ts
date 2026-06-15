import { StrokeRecorder } from './drawing/stroke';
import { drawInk } from './drawing/canvas-renderer';
import { recognize } from './recognition/recognizer';
import { GLYPHS } from './recognition/glyphs';
import { buildSpell } from './spells/spell-system';
import { ComboTracker } from './spells/combo';
import { EffectSystem, colorFor } from './effects/effects';
import { Hud } from './ui/hud';
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
const combo = new ComboTracker();
const effects = new EffectSystem();

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
canvas.addEventListener('pointerup', (e) => {
  if (!recorder.isDrawing) return;
  const stroke = recorder.finish();
  const match = recognize(stroke.points, GLYPHS);
  if (!match) return;

  const spell = buildSpell(match, stroke.duration);

  if (!spell.success) {
    hud.showSpell(spell);
    return;
  }

  const result = combo.push(spell.elementId, e.timeStamp);
  const colorId = result.type === 'combo' ? result.combo.id : spell.elementId;
  if (result.type === 'combo') {
    hud.showCombo(result.combo.name, spell.power);
  } else {
    hud.showSpell(spell);
  }

  // --- combat: нанести урон манекену ---
  if (dummy.alive) {
    const dmg = damageFor(spell);
    dummy = applyDamage(dummy, dmg);
    scene.hit(dmg);
    effects.burst(scene.target.x, scene.target.y, colorFor(colorId), spell.power);
    if (!dummy.alive) respawnAt = e.timeStamp + CONFIG.combat.respawnMs;
  }
  // --- /combat ---
});

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
  scene.update(dt);
  scene.draw(ctx, dummy, { w: canvas.width, h: canvas.height });
  effects.update(dt);
  effects.draw(ctx);
  if (recorder.isDrawing) drawInk(ctx, recorder.current);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
