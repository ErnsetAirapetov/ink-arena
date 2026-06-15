import type { Point } from '../geometry';

export interface Stroke {
  points: Point[];
  /** Длительность штриха в мс. */
  duration: number;
}

export class StrokeRecorder {
  private points: Point[] = [];
  private startTime = 0;
  private drawing = false;

  get isDrawing(): boolean {
    return this.drawing;
  }

  start(x: number, y: number, time: number): void {
    this.points = [{ x, y, t: 0 }];
    this.startTime = time;
    this.drawing = true;
  }

  add(x: number, y: number, time: number): void {
    if (!this.drawing) return;
    this.points.push({ x, y, t: time - this.startTime });
  }

  finish(): Stroke {
    const points = this.points;
    const duration = points.length > 0 ? points[points.length - 1].t : 0;
    this.points = [];
    this.drawing = false;
    return { points, duration };
  }

  /** Текущие точки (для отрисовки живого следа). */
  get current(): readonly Point[] {
    return this.points;
  }
}
