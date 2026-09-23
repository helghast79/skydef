import { Container, Graphics } from 'pixi.js';

import { theme } from '../theme';

type Battery = { x: number; y: number };

type Interceptor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  destX: number;
  destY: number;
  alive: boolean;
  graphic: Graphics;
};

type Burst = {
  x: number;
  y: number;
  age: number;
  graphic: Graphics;
};

export class DefenseSystem {
  readonly view = new Container();
  ammo = theme.defense.startingAmmo;

  private batteries: Battery[] = [];
  private readonly turrets = new Graphics();
  private interceptors: Interceptor[] = [];
  private bursts: Burst[] = [];

  constructor() {
    this.view.addChild(this.turrets);
  }

  reset(points: Battery[]): void {
    this.ammo = theme.defense.startingAmmo;
    for (const interceptor of this.interceptors) {
      interceptor.graphic.destroy();
    }
    for (const burst of this.bursts) {
      burst.graphic.destroy();
    }
    this.interceptors = [];
    this.bursts = [];
    this.layout(points);
  }

  layout(points: Battery[]): void {
    this.batteries = points;
    this.drawTurrets();
  }

  tryFire(x: number, y: number): boolean {
    if (this.ammo <= 0 || this.batteries.length === 0) {
      return false;
    }

    const origin = this.batteries.reduce((closest, battery) => {
      const dist = Math.hypot(battery.x - x, battery.y - y);
      const closestDist = Math.hypot(closest.x - x, closest.y - y);
      return dist < closestDist ? battery : closest;
    });

    const dx = x - origin.x;
    const dy = y - origin.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = theme.defense.interceptorSpeed;

    const graphic = new Graphics();
    const interceptor: Interceptor = {
      x: origin.x,
      y: origin.y,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      destX: x,
      destY: y,
      alive: true,
      graphic,
    };
    this.view.addChild(graphic);
    this.interceptors.push(interceptor);
    this.ammo -= 1;
    return true;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;

    for (const interceptor of this.interceptors) {
      interceptor.x += interceptor.vx * dt;
      interceptor.y += interceptor.vy * dt;
      interceptor.graphic.clear();
      interceptor.graphic.circle(0, 0, 3).fill({ color: theme.colors.interceptor });
      interceptor.graphic.position.set(interceptor.x, interceptor.y);

      const reached =
        Math.hypot(interceptor.x - interceptor.destX, interceptor.y - interceptor.destY) < 12;
      if (reached) {
        interceptor.alive = false;
        this.spawnBurst(interceptor.x, interceptor.y);
      }
    }

    this.interceptors = this.interceptors.filter((interceptor) => {
      if (interceptor.alive) {
        return true;
      }
      interceptor.graphic.destroy();
      return false;
    });

    for (const burst of this.bursts) {
      burst.age += dt;
      const radius = 8 + burst.age * 90;
      burst.graphic.clear();
      burst.graphic.circle(0, 0, radius).stroke({
        width: 2,
        color: theme.colors.burst,
        alpha: Math.max(0, 1 - burst.age * 2.2),
      });
      burst.graphic.position.set(burst.x, burst.y);
    }

    this.bursts = this.bursts.filter((burst) => {
      if (burst.age < 0.45) {
        return true;
      }
      burst.graphic.destroy();
      return false;
    });
  }

  consumeHits(threats: { x: number; y: number; radius: number; alive: boolean }[]): number {
    let downed = 0;
    for (const burst of this.bursts) {
      const reach = 8 + burst.age * 90;
      for (const threat of threats) {
        if (!threat.alive) {
          continue;
        }
        if (Math.hypot(threat.x - burst.x, threat.y - burst.y) < reach + threat.radius) {
          threat.alive = false;
          downed += 1;
        }
      }
    }
    return downed;
  }

  private spawnBurst(x: number, y: number): void {
    const graphic = new Graphics();
    this.view.addChild(graphic);
    this.bursts.push({ x, y, age: 0, graphic });
  }

  private drawTurrets(): void {
    this.turrets.clear();
    for (const battery of this.batteries) {
      this.turrets.rect(battery.x - 8, battery.y - 6, 16, 6).fill({ color: 0x2a3228 });
      this.turrets.rect(battery.x - 3, battery.y - 16, 6, 12).fill({ color: 0x4a5644 });
    }
  }
}
