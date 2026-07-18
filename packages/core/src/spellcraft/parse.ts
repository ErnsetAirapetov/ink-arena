import { config } from '../config.js';
import { boundingBox } from '../geometry/bbox.js';
import type { BoundingBox, Stroke } from '../geometry/types.js';
import { isClosingCircle } from '../recognition/circle.js';
import { ELEMENTS, type Element, type Verb } from '../recognition/glyphs.js';
import { recognizeGlyph } from '../recognition/recognizer.js';
import { circleGeom, classifyGlyph, type RingZone } from './boundary.js';
import { inkCost } from './cost.js';
import { spellPower } from './power.js';
import type { ActionForm, CastOutcome, Modifier, Spell, VerbRole } from './types.js';

// Парсер грамматики «ядро и орбиты» (Р26). Вход — все штрихи, нарисованные
// игроком, включая замыкающий круг (Р27); парсер сам отделяет круг детекцией
// isClosingCircle. MVP: один штрих = один глиф (соответствует корпусу Р32);
// группировка многоштриховых глифов — открытый вопрос (см. PR).
//
// Порядок каста (docs/tech/architecture.md): штрихи → recognition (глифы +
// точность) → spellcraft (композиция → заклинание или осечка). Функция чистая
// и детерминированная: без Date/Math.random/DOM.

const VERB_ROLES = config.spellcraft.verbRoles as Readonly<Record<Verb, VerbRole>>;

function isElement(g: string): g is Element {
  return (ELEMENTS as readonly string[]).includes(g);
}

interface Recognized {
  readonly glyph: Element | Verb;
  readonly accuracy: number;
  readonly box: BoundingBox;
}

export function parseComposition(strokes: readonly Stroke[]): CastOutcome {
  // 1. Отделяем замыкающий круг. Круг — самый крупный из замкнутых-круглых
  //    штрихов (охватывающий композицию). Остальное — глиф-штрихи.
  let circleIdx = -1;
  let circleDiag = -1;
  for (let i = 0; i < strokes.length; i++) {
    if (strokes[i].length >= 2 && isClosingCircle(strokes[i])) {
      const d = boundingBox(strokes[i]).diagonal;
      if (d > circleDiag) {
        circleDiag = d;
        circleIdx = i;
      }
    }
  }
  if (circleIdx === -1) {
    return { kind: 'not-sent', reason: 'circle-not-closed' };
  }

  const glyphStrokes = strokes.filter((_, i) => i !== circleIdx);
  const circle = circleGeom(strokes[circleIdx]);

  // 2. Классифицируем каждый глиф относительно круга (Р26 п.6, Р27).
  const insideStrokes: Stroke[] = [];
  let hasBoundary = false;
  let hasOutside = false;
  for (const s of glyphStrokes) {
    if (s.length === 0) continue;
    const zone: RingZone = classifyGlyph(circle, boundingBox(s));
    if (zone === 'boundary') hasBoundary = true;
    else if (zone === 'outside') hasOutside = true;
    else insideStrokes.push(s);
  }

  // Стоимость чернил считается по всем нарисованным глиф-штрихам (круг
  // бесплатен, Р27): осечка сжигает потраченное (Р29).
  const cost = inkCost(glyphStrokes);

  // Глиф на границе — осечка (нельзя решить внутри/снаружи), приоритетнее
  // «не охватил»: это структурная ошибка, а не просто несработавший круг.
  if (hasBoundary) {
    return { kind: 'misfire', reason: 'glyph-on-boundary', cost };
  }
  // Глиф целиком снаружи — круг не охватил композицию: не отправлено (Р27),
  // чернила не горят.
  if (hasOutside) {
    return { kind: 'not-sent', reason: 'circle-not-enclosing' };
  }

  // 3. Распознаём глифы внутри круга. Нераспознанные штрихи — шум, отбрасываем.
  const recognized: Recognized[] = [];
  for (const s of insideStrokes) {
    const r = recognizeGlyph(s);
    if (r) recognized.push({ glyph: r.glyph, accuracy: r.accuracy, box: boundingBox(s) });
  }
  if (recognized.length === 0) {
    return { kind: 'not-sent', reason: 'empty-composition' };
  }

  // 4. Разделяем на стихии и глаголы, проверяем структуру (Р26 п.2, п.6).
  const elements = recognized.filter((r): r is Recognized & { glyph: Element } =>
    isElement(r.glyph),
  );
  const verbs = recognized.filter((r): r is Recognized & { glyph: Verb } => !isElement(r.glyph));

  if (elements.length === 0) {
    // Есть глаголы, но нет стихии — модификатор без того, что он модифицирует.
    return { kind: 'misfire', reason: 'verb-without-element', cost };
  }
  if (elements.length >= 2) {
    // Две стихии — нет единственного ядра.
    return { kind: 'misfire', reason: 'two-elements', cost };
  }

  // 5. Ровно одно ядро (Р26 п.2). Строим заклинание.
  const core = elements[0];
  const coreSize = core.box.diagonal;

  const modifiers: Modifier[] = verbs
    .map((v) => ({
      verb: v.glyph,
      role: VERB_ROLES[v.glyph],
      // Вес = относительный размер модификатора к ядру (Р26 п.5).
      weight: coreSize === 0 ? 0 : v.box.diagonal / coreSize,
      accuracy: v.accuracy,
    }))
    // Детерминированный порядок: по убыванию веса, затем по имени глагола.
    .sort((a, b) => b.weight - a.weight || a.verb.localeCompare(b.verb));

  const spell: Spell = {
    element: core.glyph,
    action: resolveAction(modifiers),
    modifiers,
    coreAccuracy: core.accuracy,
    coreSize,
  };

  return { kind: 'spell', spell, cost, power: spellPower(spell) };
}

// Форма действия (Р25): дефолт — атака. primary-глагол (щит/хил) заменяет
// форму; при нескольких primary побеждает самый крупный (первый по сортировке).
// augment-глаголы (баф/дебаф) форму не меняют — заклинание остаётся атакой.
function resolveAction(modifiers: readonly Modifier[]): ActionForm {
  const primary = modifiers.find((m) => m.role === 'primary');
  return primary ? primary.verb : 'attack';
}
