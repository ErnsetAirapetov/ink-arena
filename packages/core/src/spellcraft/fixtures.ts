// Тестовые фикстуры spellcraft (не входят в публичный API): размещение
// идеальных глифов и построение замыкающего круга для сборки композиций.
// Аналог recognition/golden/* — чистые генераторы точек, без Math.random.
import { boundingBox } from '../geometry/bbox.js';
import type { Point, Stroke } from '../geometry/types.js';
import { rotate, scale, translate } from '../recognition/golden/distort.js';
import type { Glyph } from '../recognition/glyphs.js';
import { idealStroke } from '../recognition/shapes.js';

// Разместить идеальный глиф: масштаб size, поворот deg, центр bbox в (cx,cy).
export function place(glyph: Glyph, size: number, cx: number, cy: number, deg = 0): Point[] {
  let s: Point[] = scale(idealStroke(glyph), size);
  if (deg !== 0) s = rotate(s, (deg * Math.PI) / 180);
  return translate(s, cx - size / 2, cy - size / 2);
}

// Замыкающий круг радиуса r с центром (cx,cy) — замкнутый и круглый, проходит
// isClosingCircle.
export function ring(cx: number, cy: number, r: number, n = 48): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

// Круг, гарантированно охватывающий все глиф-штрихи с запасом (каждый глиф
// попадает в зону inside классификатора). Радиус считается по той же метрике,
// что и classifyGlyph — по самому дальнему УГЛУ bbox глифа от центра круга
// (не по точкам штриха), иначе тонкий глиф может «торчать» углом в кольцо.
export function encloseComposition(strokes: readonly Stroke[]): Point[] {
  const all: Point[] = strokes.flat();
  const bb = boundingBox(all);
  let maxCorner = 0;
  for (const s of strokes) {
    if (s.length === 0) continue;
    const g = boundingBox(s);
    for (const [x, y] of [
      [g.minX, g.minY],
      [g.maxX, g.minY],
      [g.minX, g.maxY],
      [g.maxX, g.maxY],
    ] as const) {
      const d = Math.hypot(x - bb.centerX, y - bb.centerY);
      if (d > maxCorner) maxCorner = d;
    }
  }
  // maxCorner / radius = 0.75 < внутренней границы (1 - margin) — запас.
  return ring(bb.centerX, bb.centerY, maxCorner / 0.75);
}
