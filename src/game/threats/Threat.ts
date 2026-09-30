import { Container, Graphics, Sprite, Texture } from 'pixi.js';

import type { ScoreKind } from '../scoring';
import { bombTextures, missileTextures } from '../sprites';
import { theme } from '../theme';

export type ThreatKind = 'drone' | 'bomber' | 'bomb' | 'ballistic' | 'cruise';
export type ThreatPhase = 'air';
export type DroneStage = 'strafe' | 'dive' | 'approach' | 'retreat';

type ThreatOptions = {
  kind: ThreatKind;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  controlX?: number;
  controlY?: number;
  durationMs?: number;
  hitPoints?: number;
  exitX?: number;
};

const SPRITE_SCALE = 0.05;
const MAX_DT = 1 / 30;

export class Threat {
  readonly view = new Container();
  readonly kind: ThreatKind;
  readonly scoreKind: ScoreKind;
  x: number;
  y: number;
  radius: number;
  alive = true;
  hitCity = false;
  done = false;
  phase: ThreatPhase = 'air';
  hp: number;
  readonly maxHp: number;
  readonly spawned: Threat[] = [];

  private readonly path = new Graphics();
  private readonly body = new Graphics();
  private readonly art = new Sprite();
  private exploding = false;
  private cityClaimed = false;
  private bombDropped = false;
  private animTime = 0;
  private flyingFrames: Texture[] = [];
  private explosionFrames: Texture[] = [];
  private age = 0;
  private facing = Math.PI / 2;
  private readonly targetX: number;
  private readonly targetY: number;
  private readonly exitX: number;
  private startX: number;
  private startY: number;
  private readonly controlX: number;
  private readonly controlY: number;
  private readonly durationMs: number;
  private droneStage: DroneStage;
  private readonly fromLeft: boolean;

  constructor(options: ThreatOptions) {
    this.kind = options.kind;
    this.scoreKind = options.kind === 'bomber' ? 'bomber' : options.kind;
    this.x = options.startX;
    this.y = options.startY;
    this.startX = options.startX;
    this.startY = options.startY;
    this.targetX = options.targetX;
    this.targetY = options.targetY;
    this.exitX = options.exitX ?? options.startX;
    this.controlX = options.controlX ?? (options.startX + options.targetX) / 2;
    this.controlY = options.controlY ?? Math.min(options.startY, options.targetY) - 80;
    this.durationMs = options.durationMs ?? 8000;
    this.maxHp = options.hitPoints ?? 1;
    this.hp = this.maxHp;
    this.fromLeft = options.startX < options.targetX;
    this.droneStage = options.kind === 'bomber' ? 'approach' : 'strafe';
    this.radius =
      this.kind === 'bomb' ? 10 : this.kind === 'drone' || this.kind === 'bomber' ? 12 : 14;
    this.facing = this.desiredHeading();

    if (this.kind === 'ballistic' || this.kind === 'cruise') {
      this.flyingFrames = missileTextures(this.kind, 'flying');
      this.explosionFrames = missileTextures(this.kind, 'explosion');
    } else if (this.kind === 'bomb') {
      this.flyingFrames = bombTextures('idle');
      this.explosionFrames = bombTextures('explosion');
    }

    this.art.anchor.set(0.5, 0.4);
    this.art.roundPixels = false;
    this.art.visible = false;
    this.view.addChild(this.path, this.body, this.art);
    this.buildGraphics();
    this.view.position.set(this.x, this.y);
  }

  claimCityHit(): boolean {
    if (!this.hitCity || this.cityClaimed) {
      return false;
    }
    this.cityClaimed = true;
    return true;
  }

  takeHit(): boolean {
    if (!this.alive || this.exploding) {
      return false;
    }
    this.hp -= 1;
    if (this.hp <= 0) {
      this.kill(false);
      return true;
    }
    return false;
  }

  update(deltaMs: number): void {
    const dt = Math.min(MAX_DT, deltaMs / 1000);
    if (this.exploding) {
      this.playExplosion(dt);
      return;
    }
    this.age += dt;

    if (this.kind === 'ballistic') {
      const t = Math.min(1, this.age / (this.durationMs / 1000));
      const eased = t * t * (3 - 2 * t);
      this.x = this.startX + (this.targetX - this.startX) * eased * 0.06;
      this.y = this.startY + (this.targetY - this.startY) * eased;
    } else if (this.kind === 'cruise') {
      const t = Math.min(1, this.age / (this.durationMs / 1000));
      this.x = this.bezier(this.startX, this.controlX, this.targetX, t);
      this.y = this.bezier(this.startY, this.controlY, this.targetY, t);
    } else if (this.kind === 'bomb') {
      this.y += 55 * dt;
    } else if (this.kind === 'bomber') {
      this.updateBomber(dt);
    } else {
      this.updateSuicideDrone(dt);
    }

    this.facing = this.lerpAngle(this.facing, this.desiredHeading(), Math.min(1, dt * 10));
    this.view.position.set(this.x, this.y);
    this.path.position.set(-this.x, -this.y);
    if (this.art.visible) {
      this.advanceFlying(dt);
    } else {
      this.body.rotation = this.facing;
    }

    if (this.kind === 'bomber' && this.droneStage === 'retreat') {
      const offscreen = this.fromLeft ? this.x > this.exitX : this.x < this.exitX;
      if (offscreen) {
        this.alive = false;
        this.done = true;
      }
      return;
    }

    if (this.y >= this.targetY && this.kind !== 'bomber') {
      this.kill(true);
    }
  }

  private updateSuicideDrone(dt: number): void {
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

  private updateBomber(dt: number): void {
    const cruiseSpeed = 42;
    if (this.droneStage === 'approach') {
      this.x += (this.fromLeft ? 1 : -1) * cruiseSpeed * dt;
      const reached = this.fromLeft ? this.x >= this.targetX : this.x <= this.targetX;
      if (reached && !this.bombDropped) {
        this.bombDropped = true;
        this.spawned.push(
          new Threat({
            kind: 'bomb',
            startX: this.x,
            startY: this.y + 12,
            targetX: this.x,
            targetY: this.targetY,
          }),
        );
        this.droneStage = 'retreat';
      }
      return;
    }

    this.x += (this.fromLeft ? 1 : -1) * cruiseSpeed * dt;
  }

  private bezier(p0: number, p1: number, p2: number, t: number): number {
    const inv = 1 - t;
    return inv * inv * p0 + 2 * inv * t * p1 + t * t * p2;
  }

  private desiredHeading(): number {
    if (this.kind === 'ballistic' || this.kind === 'bomb') {
      return Math.PI / 2;
    }
    if (this.kind === 'cruise') {
      const t = Math.min(0.98, this.age / (this.durationMs / 1000));
      const nx = this.bezier(this.startX, this.controlX, this.targetX, t + 0.02);
      const ny = this.bezier(this.startY, this.controlY, this.targetY, t + 0.02);
      return Math.atan2(ny - this.y, nx - this.x);
    }
    if (this.kind === 'bomber' || this.droneStage === 'strafe') {
      return this.fromLeft ? 0 : Math.PI;
    }
    return Math.atan2(this.targetY - this.y, this.targetX - this.x);
  }

  private lerpAngle(from: number, to: number, amount: number): number {
    let delta = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (delta < -Math.PI) {
      delta += Math.PI * 2;
    }
    return from + delta * amount;
  }

  private buildGraphics(): void {
    this.body.clear();
    this.path.clear();
    this.path.position.set(-this.x, -this.y);

    if (this.kind === 'cruise') {
      this.drawDashedCurve();
      this.showFlying();
      return;
    }

    if (this.kind === 'ballistic' || this.kind === 'bomb') {
      this.showFlying();
      return;
    }

    this.buildBody();
  }

  private buildBody(): void {
    this.body.clear();
    this.body.visible = true;
    if (this.kind === 'bomber') {
      this.body.rect(-14, -4, 28, 8).fill({ color: 0x3a4a3a });
      this.body.rect(-18, -2, 8, 4).fill({ color: 0x88aa88 });
      this.body.rect(10, -2, 8, 4).fill({ color: 0x88aa88 });
      this.body.circle(0, 2, 3).fill({ color: 0xffaa44 });
      return;
    }
    this.body.rect(-10, -3, 20, 6).fill({ color: theme.colors.threatDrone });
    this.body.rect(-14, -1, 8, 2).fill({ color: 0x88aa88 });
    this.body.rect(6, -1, 8, 2).fill({ color: 0x88aa88 });
    this.body.circle(0, 0, 2).fill({ color: 0xff4444 });
  }

  private showFlying(): void {
    if (this.flyingFrames.length === 0) {
      this.buildBody();
      return;
    }
    this.body.visible = false;
    this.art.visible = true;
    this.art.blendMode = 'normal';
    this.art.anchor.set(0.5, this.kind === 'bomb' ? 0.5 : 0.42);
    this.art.texture = this.flyingFrames[0];
    this.art.scale.set(SPRITE_SCALE);
    this.art.rotation = this.facing + Math.PI / 2;
  }

  private advanceFlying(dt: number): void {
    if (this.flyingFrames.length === 0) {
      return;
    }
    this.animTime += dt;
    const fps = Math.max(8, this.flyingFrames.length * 1.2);
    const index = Math.floor(this.animTime * fps) % this.flyingFrames.length;
    const frame = this.flyingFrames[index];
    if (this.art.texture !== frame) {
      this.art.texture = frame;
    }
    this.art.rotation = this.facing + Math.PI / 2;
  }

  private playExplosion(dt: number): void {
    if (this.explosionFrames.length === 0) {
      this.done = true;
      return;
    }
    this.view.position.set(this.x, this.y);
    this.animTime += dt;
    const fps = Math.max(12, this.explosionFrames.length * 1.4);
    const index = Math.floor(this.animTime * fps);
    if (index >= this.explosionFrames.length) {
      this.exploding = false;
      this.done = true;
      this.art.visible = false;
      return;
    }
    const frame = this.explosionFrames[index];
    if (this.art.texture !== frame) {
      this.art.texture = frame;
    }
  }

  private kill(hitCity: boolean): void {
    if (this.exploding || this.done) {
      return;
    }
    this.alive = false;
    if (hitCity) {
      this.hitCity = true;
    }
    if (this.explosionFrames.length === 0) {
      this.done = true;
      return;
    }
    this.exploding = true;
    this.animTime = 0;
    this.path.visible = false;
    this.body.visible = false;
    this.art.visible = true;
    this.art.blendMode = 'add';
    this.art.anchor.set(0.5);
    this.art.rotation = this.facing + Math.PI / 2;
    this.art.texture = this.explosionFrames[0];
    this.art.scale.set(SPRITE_SCALE);
    this.view.position.set(this.x, this.y);
  }

  private drawDashedCurve(): void {
    const steps = 48;
    for (let i = 0; i < steps; i += 2) {
      const t0 = i / steps;
      const t1 = Math.min(1, (i + 0.7) / steps);
      this.path.moveTo(
        this.bezier(this.startX, this.controlX, this.targetX, t0),
        this.bezier(this.startY, this.controlY, this.targetY, t0),
      );
      this.path.lineTo(
        this.bezier(this.startX, this.controlX, this.targetX, t1),
        this.bezier(this.startY, this.controlY, this.targetY, t1),
      );
    }
    this.path.stroke({ width: 1, color: 0xffe08a, alpha: 0.14 });
  }
}
