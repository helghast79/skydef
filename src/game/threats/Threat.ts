import { Container, Graphics, Text } from 'pixi.js';

import { theme } from '../theme';

export type ThreatKind = 'drone' | 'ballistic' | 'cruise';
export type ThreatPhase = 'alert' | 'air';
export type DroneStage = 'strafe' | 'dive';

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
  hitPoints?: number;
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
  hp: number;
  readonly maxHp: number;

  private readonly path = new Graphics();
  private readonly body = new Graphics();
  private readonly mark = new Text({
    text: 'INCOMING',
    style: {
      fontFamily: '"Oswald", sans-serif',
      fontSize: 13,
      fill: 0xffe08a,
      letterSpacing: 1,
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
  private droneStage: DroneStage = 'strafe';
  private readonly fromLeft: boolean;

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
    this.warnMs = options.warnMs ?? 3000;
    this.durationMs = options.durationMs ?? 8000;
    this.maxHp = options.hitPoints ?? (options.kind === 'ballistic' ? 3 : 1);
    this.hp = this.maxHp;
    this.radius = this.kind === 'drone' ? 11 : this.kind === 'cruise' ? 9 : 9;
    this.fromLeft = options.startX < options.targetX;

    this.mark.anchor.set(0.5, 1.15);
    this.view.addChild(this.path, this.body, this.mark);
    this.view.position.set(this.x, this.y);
    this.redraw();
  }

  takeHit(): boolean {
    if (!this.alive || this.phase !== 'air') {
      return false;
    }
    this.hp -= 1;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.age += dt;

    if (this.kind === 'ballistic' && this.phase === 'alert') {
      this.x = this.targetX;
      this.y = 58;
      if (this.age >= this.warnMs / 1000) {
        this.phase = 'air';
        this.age = 0;
        this.x = this.targetX;
        this.y = 40;
        this.startX = this.x;
        this.startY = this.y;
      }
    } else if (this.kind === 'ballistic') {
      const t = Math.min(1, this.age / (this.durationMs / 1000));
      this.x = this.startX + (this.targetX - this.startX) * t * 0.06;
      this.y = this.startY + (this.targetY - this.startY) * t;
    } else if (this.kind === 'cruise') {
      const t = Math.min(1, this.age / (this.durationMs / 1000));
      this.x = this.bezier(this.startX, this.controlX, this.targetX, t);
      this.y = this.bezier(this.startY, this.controlY, this.targetY, t);
    } else {
      this.updateDrone(dt);
    }

    this.view.position.set(this.x, this.y);
    this.redraw();

    if (this.phase === 'air' && this.y >= this.targetY) {
      this.alive = false;
      this.hitCity = true;
    }
  }

  private updateDrone(dt: number): void {
    const strafeSpeed = 18;
    const diveSpeed = 22;

    if (this.droneStage === 'strafe') {
      this.x += (this.fromLeft ? 1 : -1) * strafeSpeed * dt;
      const linedUp = this.fromLeft ? this.x >= this.targetX - 70 : this.x <= this.targetX + 70;
      if (linedUp) {
        this.droneStage = 'dive';
      }
      return;
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const length = Math.hypot(dx, dy) || 1;
    this.x += (dx / length) * diveSpeed * dt;
    this.y += (dy / length) * diveSpeed * dt;
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
    if (this.droneStage === 'strafe') {
      return this.fromLeft ? 0 : Math.PI;
    }
    return Math.atan2(this.targetY - this.y, this.targetX - this.x);
  }

  private redraw(): void {
    this.body.clear();
    this.path.clear();
    this.path.position.set(-this.x, -this.y);
    this.mark.visible = this.kind === 'ballistic' && this.phase === 'alert';

    if (this.kind === 'ballistic' && this.phase === 'alert') {
      this.drawBallisticAlert();
      return;
    }

    if (this.kind === 'cruise') {
      this.drawDashedCurve();
    }

    this.body.rotation = this.heading();

    switch (this.kind) {
      case 'drone':
        this.body.rect(-10, -3, 20, 6).fill({ color: theme.colors.threatDrone });
        this.body.rect(-14, -1, 8, 2).fill({ color: 0x88aa88 });
        this.body.rect(6, -1, 8, 2).fill({ color: 0x88aa88 });
        this.body.circle(0, 0, 2).fill({ color: 0xff4444 });
        break;
      case 'ballistic':
        this.body.moveTo(0, -12).lineTo(4, 9).lineTo(-4, 9).fill({ color: theme.colors.threatBallistic });
        this.body.rect(-1.5, 9, 3, 8).fill({ color: 0xffaa66, alpha: 0.85 });
        this.drawHp();
        break;
      case 'cruise':
        this.body.rect(-14, -3, 26, 6).fill({ color: theme.colors.threatCruise });
        this.body.moveTo(12, -3).lineTo(20, 0).lineTo(12, 3).fill({ color: 0x6a6a4a });
        this.body.rect(-10, -6, 6, 3).fill({ color: 0x333328 });
        break;
    }
  }

  private drawBallisticAlert(): void {
    const pulse = 0.55 + Math.sin(this.age * 8) * 0.45;
    this.body.circle(0, 0, 22).fill({ color: 0x4a1010, alpha: 0.92 });
    this.body.circle(0, 0, 22).stroke({ width: 4, color: 0xffe08a, alpha: 0.75 + pulse * 0.25 });
    this.body.moveTo(0, 34).lineTo(14, 14).lineTo(-14, 14).fill({
      color: theme.colors.warning,
      alpha: 0.7 + pulse * 0.3,
    });
    this.body.circle(0, 0, 5).fill({ color: 0xffe08a, alpha: 0.85 + pulse * 0.15 });
    this.mark.alpha = 0.8 + pulse * 0.2;

    const dash = 12;
    const endY = this.targetY - 10;
    for (let y = this.y + 36; y < endY; y += dash * 2) {
      this.path.moveTo(this.x, y);
      this.path.lineTo(this.x, Math.min(y + dash, endY));
    }
    this.path.stroke({ width: 3, color: 0xffe08a, alpha: 0.55 + pulse * 0.3 });
    this.path.moveTo(this.x - 14, this.targetY);
    this.path.lineTo(this.x, this.targetY - 14);
    this.path.lineTo(this.x + 14, this.targetY);
    this.path.lineTo(this.x, this.targetY + 8);
    this.path.closePath();
    this.path.fill({ color: theme.colors.warning, alpha: 0.35 + pulse * 0.25 });
    this.path.stroke({ width: 2, color: 0xffe08a, alpha: 0.8 });
  }

  private drawDashedCurve(): void {
    const steps = 28;
    for (let i = 0; i < steps; i += 2) {
      const t0 = i / steps;
      const t1 = Math.min(1, (i + 1) / steps);
      this.path.moveTo(
        this.bezier(this.startX, this.controlX, this.targetX, t0),
        this.bezier(this.startY, this.controlY, this.targetY, t0),
      );
      this.path.lineTo(
        this.bezier(this.startX, this.controlX, this.targetX, t1),
        this.bezier(this.startY, this.controlY, this.targetY, t1),
      );
    }
    this.path.stroke({ width: 1.5, color: 0xffe08a, alpha: 0.45 });
  }

  private drawHp(): void {
    const width = 16;
    const start = -width / 2;
    const step = width / this.maxHp;
    for (let i = 0; i < this.maxHp; i += 1) {
      this.body.rect(start + i * step, 16, step - 1, 3).fill({
        color: i < this.hp ? 0xff6a4a : 0x3a2020,
      });
    }
  }
}
