import { Container, Graphics } from 'pixi.js';

import { theme } from '../theme';

export type ThreatKind = 'bomb' | 'drone' | 'ballistic' | 'cruise';

export class Threat {
  readonly view = new Container();
  readonly kind: ThreatKind;
  x: number;
  y: number;
  radius: number;
  alive = true;
  hitCity = false;

  private readonly body = new Graphics();
  private vx: number;
  private vy: number;
  private age = 0;
  private readonly targetY: number;
  private readonly targetX: number;
  private readonly startX: number;
  private readonly startY: number;

  constructor(kind: ThreatKind, startX: number, startY: number, targetX: number, targetY: number) {
    this.kind = kind;
    this.x = startX;
    this.y = startY;
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;

    switch (kind) {
      case 'bomb':
        this.vx = (targetX - startX) * 0.08;
        this.vy = 90 + Math.random() * 40;
        this.radius = 8;
        break;
      case 'drone':
        this.vx = (targetX > startX ? 1 : -1) * (70 + Math.random() * 30);
        this.vy = 18;
        this.radius = 10;
        break;
      case 'ballistic':
        this.vx = 0;
        this.vy = 0;
        this.radius = 7;
        break;
      case 'cruise':
        this.vx = (targetX > startX ? 1 : -1) * (140 + Math.random() * 40);
        this.vy = 8;
        this.radius = 9;
        break;
    }

    this.view.addChild(this.body);
    this.view.position.set(this.x, this.y);
    this.redraw();
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.age += dt;

    if (this.kind === 'ballistic') {
      const duration = 4.2;
      const t = Math.min(1, this.age / duration);
      this.x = this.startX + (this.targetX - this.startX) * t;
      this.y = this.startY + (this.targetY - this.startY) * t - Math.sin(t * Math.PI) * 180;
    } else if (this.kind === 'drone') {
      this.x += this.vx * dt;
      this.y += this.vy * dt + Math.sin(this.age * 3) * 12 * dt * 20;
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.kind === 'bomb') {
        this.vy += 70 * dt;
      }
    }

    this.view.position.set(this.x, this.y);
    this.view.rotation = this.heading();
    this.redraw();

    if (this.y >= this.targetY) {
      this.alive = false;
      this.hitCity = true;
    }
  }

  private heading(): number {
    if (this.kind === 'bomb') {
      return Math.atan2(this.vy, this.vx || 0.01);
    }
    if (this.kind === 'ballistic') {
      return Math.atan2(this.targetY - this.y, this.targetX - this.x);
    }
    return Math.atan2(this.vy, this.vx);
  }

  private redraw(): void {
    this.body.clear();

    switch (this.kind) {
      case 'bomb':
        this.body.ellipse(0, 0, 5, 9).fill({ color: theme.colors.threatBomb });
        this.body.rect(-4, 6, 8, 3).fill({ color: 0x222222 });
        break;
      case 'drone':
        this.body.rect(-10, -3, 20, 6).fill({ color: theme.colors.threatDrone });
        this.body.rect(-14, -1, 8, 2).fill({ color: 0x88aa88 });
        this.body.rect(6, -1, 8, 2).fill({ color: 0x88aa88 });
        this.body.circle(0, 0, 2).fill({ color: 0xff4444 });
        break;
      case 'ballistic':
        this.body.moveTo(0, -10).lineTo(3, 8).lineTo(-3, 8).fill({ color: theme.colors.threatBallistic });
        this.body.rect(-1, 8, 2, 6).fill({ color: 0xffaa66, alpha: 0.8 });
        break;
      case 'cruise':
        this.body.rect(-14, -3, 26, 6).fill({ color: theme.colors.threatCruise });
        this.body.moveTo(12, -3).lineTo(20, 0).lineTo(12, 3).fill({ color: 0x6a6a4a });
        this.body.rect(-10, -6, 6, 3).fill({ color: 0x333328 });
        break;
    }
  }
}
