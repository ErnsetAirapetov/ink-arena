import { StrokeRecorder, type Stroke } from './drawing/stroke';
import { drawInk } from './drawing/canvas-renderer';
import { recognize, type MatchResult } from './recognition/recognizer';
import { GLYPHS } from './recognition/glyphs';
import { clusterStrokes } from './recognition/clustering';
import { parseSpell } from './spells/spell-types';
import { EffectSystem, colorFor } from './effects/effects';
import { Hud } from './ui/hud';
import { GuideOverlay } from './ui/guide';
import { CONFIG } from './config';
import { boundingBox } from './geometry';
import { createCombatant, applyDamage, respawn, applyAttack, sizeFactor, damageFor, flightTimeMs } from './combat/combat';
import { addShield, tickStatuses } from './combat/status';
import { createDummyAi, tickDummyAi, telegraphElement } from './combat/dummy-ai';
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
const strokes: Stroke[] = [];

// --- combat ---
let dummy = createCombatant(CONFIG.combat.dummyHp);
let player = createCombatant(CONFIG.combat.playerHp);
let ai = createDummyAi();
const scene = new CombatScene();
const projectiles = new ProjectileSystem();
let dummyRespawnAt: number | null = null;
let playerRespawnAt: number | null = null;
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

  const spell = parseSpell(results);

  if (spell.kind === 'fizzle') {
    hud.showFizzle(spell.reason);
    strokes.length = 0;
    return;
  }

  if (spell.kind === 'shield') {
    player = {
      ...player,
      statuses: addShield(player.statuses, spell.element, CONFIG.combat.shieldAbsorb, CONFIG.combat.shieldMs),
    };
    hud.showShield(spell.element, CONFIG.combat.shieldMs);
    strokes.length = 0;
    return;
  }

  // атака или комбо → снаряд в манекен
  const all = strokes.flatMap((s) => s.points);
  const box = boundingBox(all);
  const spellSizePx = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  const sf = sizeFactor(spellSizePx);
  const accuracy = spell.power / 100;
  const damage = damageFor(sf, accuracy);
  const flightMs = flightTimeMs(sf);
  const colorId = spell.kind === 'combo' ? spell.id : spell.element;
  projectiles.spawn({
    from: scene.origin,
    to: scene.target,
    flightMs,
    damage,
    colorId,
    target: 'dummy',
    element: spell.kind === 'attack' ? spell.element : '',
  });
  hud.showAttack(spell, sf, damage, flightMs);

  strokes.length = 0;
}

let last = performance.now();
function loop(now: number): void {
  const dt = now - last;
  last = now;

  // респавны
  if (dummyRespawnAt !== null && now >= dummyRespawnAt) {
    dummy = respawn(dummy);
    dummyRespawnAt = null;
  }
  if (playerRespawnAt !== null && now >= playerRespawnAt) {
    player = respawn(player);
    playerRespawnAt = null;
  }

  // тик статусов
  player = { ...player, statuses: tickStatuses(player.statuses, dt) };
  dummy = { ...dummy, statuses: tickStatuses(dummy.statuses, dt) };

  // ИИ манекена: телеграф и выстрел по игроку
  const tick = tickDummyAi(ai, dt);
  ai = tick.ai;
  scene.setTelegraph(telegraphElement(ai));
  if (tick.fire && dummy.alive) {
    projectiles.spawn({
      from: scene.target,
      to: scene.origin,
      flightMs: CONFIG.combat.referenceFlightMs,
      damage: CONFIG.combat.dummyDamage,
      colorId: tick.fire.element,
      target: 'player',
      element: tick.fire.element,
    });
  }

  // прилёты снарядов
  for (const a of projectiles.update(dt)) {
    if (a.target === 'player') {
      if (player.alive) {
        const before = player.hp;
        player = applyAttack(player, a.damage, a.element);
        const dealt = before - player.hp;
        scene.hitPlayer(dealt);
        effects.burst(a.x, a.y, colorFor(a.colorId), Math.min(100, dealt + 20));
        if (!player.alive) playerRespawnAt = now + CONFIG.combat.playerRespawnMs;
      }
    } else if (dummy.alive) {
      dummy = applyDamage(dummy, a.damage);
      scene.hit(a.damage);
      effects.burst(a.x, a.y, colorFor(a.colorId), Math.min(100, a.damage + 20));
      if (!dummy.alive) dummyRespawnAt = now + CONFIG.combat.respawnMs;
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
