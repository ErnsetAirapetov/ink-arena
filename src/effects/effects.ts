interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1..0
  color: string;
}

export class EffectSystem {
  private particles: Particle[] = [];

  burst(x: number, y: number, color: string, power: number): void {
    const count = 12 + Math.round(power / 3);
    for (let i = 0; i < count; i++) {
      const a = (2 * Math.PI * i) / count;
      const speed = 1 + (power / 100) * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 1,
        color,
      });
    }
  }

  update(dt: number): void {
    const decay = dt / 700;
    for (const p of this.particles) {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.life -= decay;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Цвет эффекта по id элемента/комбо. */
export function colorFor(id: string): string {
  const map: Record<string, string> = {
    fire: '#ff6a3d',
    water: '#3da5ff',
    shield: '#ffd23d',
    arrow: '#c9d1d9',
    fireball: '#ff3d3d',
    'healing-barrier': '#3dffa5',
  };
  return map[id] ?? '#ffffff';
}
