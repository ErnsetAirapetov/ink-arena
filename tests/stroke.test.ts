import { describe, it, expect } from 'vitest';
import { StrokeRecorder } from '../src/drawing/stroke';

describe('StrokeRecorder', () => {
  it('записывает точки с относительным временем', () => {
    const r = new StrokeRecorder();
    r.start(10, 20, 1000);
    r.add(30, 40, 1100);
    const stroke = r.finish();
    expect(stroke.points).toEqual([
      { x: 10, y: 20, t: 0 },
      { x: 30, y: 40, t: 100 },
    ]);
  });

  it('duration равна времени между первой и последней точкой', () => {
    const r = new StrokeRecorder();
    r.start(0, 0, 5000);
    r.add(1, 1, 5250);
    expect(r.finish().duration).toBe(250);
  });

  it('isDrawing отражает состояние записи', () => {
    const r = new StrokeRecorder();
    expect(r.isDrawing).toBe(false);
    r.start(0, 0, 0);
    expect(r.isDrawing).toBe(true);
    r.finish();
    expect(r.isDrawing).toBe(false);
  });

  it('add без start игнорируется', () => {
    const r = new StrokeRecorder();
    r.add(1, 1, 100);
    expect(r.isDrawing).toBe(false);
  });
});
