import { Container, Graphics, Text } from 'pixi.js';

import { theme } from '../theme';

export type ThreatKind = 'drone' | 'ballistic' | 'cruise';
export type ThreatPhase = 'space' | 'air';

type ThreatOptions = {
  kind: ThreatKind;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  controlX?: number;
  controlY?: number;
  phase?: ThreatPhase;
  warnMs?: number;
  durationMs?: number;
};

export class Threat {
  readonly view = new Container();
  readonly kind: ThreatKind;
  x: number;
  y: number;
  radius: number;
  alive = true;
  hitCity = false;
  phase: ThreatPhase;

  private readonly body = new Graphics();
  private readonly label = new Text({
    text: 'BALLISTIC',
    style: {
      fontFamily: '"Courier New", monospace',
      fontSize: 11,
      fill: 0xffe8e0,
    },
  });
  private age = 0;
  private readonly targetX: number;
  private readonly targetY: number;
  private startX: number;
  private startY: number;
  private readonly controlX: number;
  private readonly controlY: number;
  private readonly warnMs: number;
  private readonly durationMs: number;

  constructor(options: ThreatOptions) {
    this.kind = options.kind;
    this.phase = options.phase ?? 'air';
    this.x = options.startX;
    this.y = options.startY;
    this.startX = options.startX;
    this.startY = options.startY;
    this.targetX = options.targetX;
    this.targetY = options.targetY;
    this.controlX = options.controlX ?? (options.startX + options.targetX) / 2;
    this.controlY = options.controlY ?? Math.min(options.startY, options.targetY) - 80;
    this.warnMs = options.warnMs ?? 5600;
    this.durationMs = options.durationMs ?? 8000;
    this.radius = this.kind === 'drone' ? 11 : this.kind === 'cruise' ? 9 : 8;

    this.label.anchor.set(0.5, 1);
    this.view.addChild(this.body);
    if (this.phase === 'space') {
      this.view.addChild(this.label);
    }
    this.view.position.set(this.x, this.y);
    this.redraw();
  }

  get progress(): number {
    if (this.phase !== 'space') {
      return 1;
    }
    return Math.min(1, this.age / (this.warnMs / 1000));
  }

  contains(px: number, py: number): boolean {
    if (this.phase === 'space') {
      return Math.abs(px - this.x) < 64 && Math.abs(py - this.y) < 22;
    }
    return Math.hypot(px - this.x, py - this.y) < this.radius + 10;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.age += dt;

    if (this.kind === 'ballistic' && this.phase === 'space') {
      this.x = this.targetX;
      this.y = 22;
      if (this.age >= this.warnMs / 1000) {
        this.phase = 'air';
        this.age = 0;
        this.x = this.targetX;
        this.y = 40;
        this.startX = this.x;
        this.startY = this.y;
        if (this.label.parent) {
          this.label.parent.removeChild(this.label);
        }
      }
    } else if (this.kind === 'ballistic') {
      const t = Math.min(1, this.age / (this.durationMs / 1000));
      this.x = this.startX + (this.targetX - this.startX) * t * 0.08;
      this.y = this.startY + (this.targetY - this.startY) * t;
    } else if (this.kind === 'cruise') {
      const t = Math.min(1, this.age / (this.durationMs / 1000));
      this.x = this.bezier(this.startX, this.controlX, this.targetX, t);
      this.y = this.bezier(this.startY, this.controlY, this.targetY, t);
    } else {
      const speed = 40;
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const length = Math.hypot(dx, dy) || 1;
      this.x += (dx / length) * speed * dt;
      this.y += (dy / length) * speed * dt + Math.sin(this.age * 2.4) * 10 * dt;
    }

    this.view.position.set(this.x, this.y);
    this.view.rotation = this.phase === 'space' ? 0 : this.heading();
    this.redraw();

    if (this.phase === 'air' && this.y >= this.targetY) {
      this.alive = false;
      this.hitCity = true;
    }
  }

  private bezier(p0: number, p1: number, p2: number, t: number): number {
    const inv = 1 - t;
    return inv * inv * p0 + 2 * inv * t * p1 + t * t * p2;
  }

  private heading(): number {
    if (this.kind === 'ballistic') {
      return Math.PI / 2;
    }
    if (this.kind === 'cruise') {
      const t = Math.min(0.98, this.age / (this.durationMs / 1000));
      const nx = this.bezier(this.startX, this.controlX, this.targetX, t + 0.02);
      const ny = this.bezier(this.startY, this.controlY, this.targetY, t + 0.02);
      return Math.atan2(ny - this.y, nx - this.x);
    }
    return Math.atan2(this.targetY - this.y, this.targetX - this.x);
  }

  private redraw(): void {
    this.body.clear();
    this.label.visible = this.phase === 'space';

    if (this.phase === 'space') {
      const width = 120;
      const height = 28;
      this.body.roundRect(-width / 2, -height / 2, width, height, 4).fill({
        color: 0x4a1010,
        alpha: 0.96,
      });
      this.body.roundRect(-width / 2, -height / 2, width, height, 4).stroke({
        width: 2,
        color: theme.colors.warning,
        alpha: 1,
      });
      this.body.rect(-width / 2 + 8, 6, width - 16, 5).fill({ color: 0x2a0808 });
      this.body.rect(-width / 2 + 8, 6, (width - 16) * this.progress, 5).fill({
        color: 0xffc14a,
      });
      this.label.position.set(0, 2);
      return;
    }

    switch (this.kind) {
      case 'drone':
        this.body.rect(-10, -3, 20, 6).fill({ color: theme.colors.threatDrone });
        this.body.rect(-14, -1, 8, 2).fill({ color: 0x88aa88 });
        this.body.rect(6, -1, 8, 2).fill({ color: 0x88aa88 });
        this.body.circle(0, 0, 2).fill({ color: 0xff4444 });
        break;
      case 'ballistic':
        this.body.moveTo(0, -11).lineTo(3, 8).lineTo(-3, 8).fill({ color: theme.colors.threatBallistic });
        this.body.rect(-1, 8, 2, 7).fill({ color: 0xffaa66, alpha: 0.85 });
        break;
      case 'cruise':
        this.body.rect(-14, -3, 26, 6).fill({ color: theme.colors.threatCruise });
        this.body.moveTo(12, -3).lineTo(20, 0).lineTo(12, 3).fill({ color: 0x6a6a4a });
        this.body.rect(-10, -6, 6, 3).fill({ color: 0x333328 });
        break;
    }
  }
}
