import { Container, Graphics, Sprite } from 'pixi.js';

import type { ScoreKind } from '../scoring';
import { scoreFor } from '../scoring';
import { fxTextures } from '../sprites';
import type { Threat } from '../threats/Threat';
import type { WeaponId } from './weapons';
import { WEAPON_IDS, WEAPONS } from './weapons';

type Projectile = {
  weapon: WeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  hitRadius: number;
  killChanceMin: number;
  killChanceMax: number;
  checked: Set<Threat>;
  graphic: Graphics;
  alive: boolean;
};

type Burst = {
  age: number;
  frames: ReturnType<typeof fxTextures>;
  sprite: Sprite;
};

export type KillEvent = {
  kind: ScoreKind;
  points: number;
};

const HEAT_COOL_PER_SEC = 18;
const OVERHEAT_RECOVER = 28;
const MAX_HEAT = 100;
const MAX_BURSTS = 6;
const MAX_IMPACTS = 12;

export class DefenseSystem {
  readonly view = new Container();
  selected: WeaponId = 'artillery';
  heat = 0;
  overheated = false;
  owned: WeaponId[] = ['artillery'];
  ammo: Record<WeaponId, number> = {
    artillery: 0,
    missile: 0,
    flak: 0,
  };

  private gunX = 0;
  private gunY = 0;
  private aim = -Math.PI / 2;
  private fireCooldown = 0;
  private readonly gun = new Graphics();
  private readonly projectiles: Projectile[] = [];
  private readonly bursts: Burst[] = [];
  private readonly impacts: { age: number; graphic: Graphics }[] = [];
  private readonly pendingKills: KillEvent[] = [];
  private readonly shotPool: Graphics[] = [];
  private readonly impactPool: Graphics[] = [];
  private lastGunKey = '';

  constructor() {
    this.view.addChild(this.gun);
  }

  reset(gunX: number, gunY: number): void {
    this.gunX = gunX;
    this.gunY = gunY;
    this.selected = 'artillery';
    this.heat = 0;
    this.overheated = false;
    this.fireCooldown = 0;
    this.owned = WEAPON_IDS.filter((id) => WEAPONS[id].startOwned);
    for (const id of WEAPON_IDS) {
      this.ammo[id] = WEAPONS[id].startAmmo;
    }
    for (const shot of this.projectiles) {
      this.releaseShot(shot.graphic);
    }
    this.projectiles.length = 0;
    for (const burst of this.bursts) {
      burst.sprite.destroy();
    }
    this.bursts.length = 0;
    for (const impact of this.impacts) {
      this.releaseImpact(impact.graphic);
    }
    this.impacts.length = 0;
    this.pendingKills.length = 0;
    this.aim = -Math.PI / 2;
    this.lastGunKey = '';
    this.drawGun(true);
  }

  setGun(gunX: number, gunY: number): void {
    this.gunX = gunX;
    this.gunY = gunY;
    this.drawGun(true);
  }

  select(weapon: WeaponId): void {
    if (!this.owned.includes(weapon)) {
      return;
    }
    this.selected = weapon;
    this.drawGun();
  }

  grantWeapon(weapon: WeaponId, ammo: number): void {
    if (!this.owned.includes(weapon)) {
      this.owned.push(weapon);
      this.owned.sort((a, b) => WEAPON_IDS.indexOf(a) - WEAPON_IDS.indexOf(b));
    }
    const def = WEAPONS[weapon];
    if (def.meter === 'ammo') {
      this.ammo[weapon] = Math.min(def.maxAmmo, this.ammo[weapon] + ammo);
    }
  }

  tryFire(targetX: number, targetY: number): boolean {
    if (this.fireCooldown > 0) {
      return false;
    }

    const weapon = this.selected;
    const def = WEAPONS[weapon];

    if (weapon === 'artillery') {
      if (this.overheated || this.heat >= MAX_HEAT) {
        this.overheated = true;
        this.drawGun();
        return false;
      }
    } else if (this.ammo[weapon] <= 0) {
      return false;
    }

    const dx = targetX - this.gunX;
    const dy = targetY - this.gunY;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    this.aim = Math.atan2(uy, ux);

    const graphic = this.acquireShot(weapon, def.color);
    graphic.rotation = this.aim + Math.PI / 2;
    graphic.position.set(this.gunX + ux * 18, this.gunY + uy * 18);
    this.view.addChild(graphic);

    this.projectiles.push({
      weapon,
      x: this.gunX + ux * 18,
      y: this.gunY + uy * 18,
      vx: ux * def.projectileSpeed,
      vy: uy * def.projectileSpeed,
      targetX,
      targetY,
      hitRadius: def.hitRadius,
      killChanceMin: def.killChanceMin,
      killChanceMax: def.killChanceMax,
      checked: new Set(),
      graphic,
      alive: true,
    });

    this.fireCooldown = def.fireCooldownMs;
    if (weapon === 'artillery') {
      this.heat = Math.min(MAX_HEAT, this.heat + def.heatPerShot);
      if (this.heat >= MAX_HEAT) {
        this.overheated = true;
      }
    } else {
      this.ammo[weapon] -= 1;
    }

    this.drawGun();
    return true;
  }

  update(deltaMs: number, threats: Threat[]): void {
    const dt = deltaMs / 1000;
    this.fireCooldown = Math.max(0, this.fireCooldown - deltaMs);

    this.heat = Math.max(0, this.heat - HEAT_COOL_PER_SEC * dt);
    if (this.overheated && this.heat <= OVERHEAT_RECOVER) {
      this.overheated = false;
      this.drawGun();
    }

    for (const shot of this.projectiles) {
      if (!shot.alive) {
        continue;
      }
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.graphic.position.set(shot.x, shot.y);

      for (const threat of threats) {
        if (!threat.alive || shot.checked.has(threat)) {
          continue;
        }
        const dist = Math.hypot(threat.x - shot.x, threat.y - shot.y);
        if (dist > shot.hitRadius + threat.radius) {
          continue;
        }
        shot.checked.add(threat);
        const closeness = 1 - Math.min(1, dist / (shot.hitRadius + threat.radius));
        const chance =
          shot.killChanceMin + (shot.killChanceMax - shot.killChanceMin) * closeness;
        if (Math.random() <= chance && threat.takeHit()) {
          this.pendingKills.push({
            kind: threat.scoreKind,
            points: scoreFor(threat.scoreKind),
          });
          shot.alive = false;
          break;
        }
      }

      if (!shot.alive) {
        continue;
      }

      const toTarget = Math.hypot(shot.targetX - shot.x, shot.targetY - shot.y);
      const reach = Math.hypot(shot.targetX - this.gunX, shot.targetY - this.gunY);
      const traveled =
        (shot.x - this.gunX) * (shot.targetX - this.gunX) +
        (shot.y - this.gunY) * (shot.targetY - this.gunY);
      if (toTarget < 10 || traveled > reach * reach) {
        this.spawnImpact(shot.targetX, shot.targetY, shot.weapon);
        shot.alive = false;
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const shot = this.projectiles[i];
      if (shot.alive) {
        continue;
      }
      this.releaseShot(shot.graphic);
      this.projectiles.splice(i, 1);
    }

    for (let i = this.bursts.length - 1; i >= 0; i -= 1) {
      const burst = this.bursts[i];
      burst.age += dt;
      const fps = Math.max(12, burst.frames.length * 1.5);
      const index = Math.floor(burst.age * fps);
      if (index >= burst.frames.length) {
        burst.sprite.destroy();
        this.bursts.splice(i, 1);
        continue;
      }
      const frame = burst.frames[index];
      if (burst.sprite.texture !== frame) {
        burst.sprite.texture = frame;
      }
    }

    for (let i = this.impacts.length - 1; i >= 0; i -= 1) {
      const impact = this.impacts[i];
      impact.age += dt;
      impact.graphic.alpha = Math.max(0, 1 - impact.age / 0.18);
      if (impact.age >= 0.18) {
        this.releaseImpact(impact.graphic);
        this.impacts.splice(i, 1);
      }
    }
  }

  consumeHits(): KillEvent[] {
    return this.pendingKills.splice(0, this.pendingKills.length);
  }

  spawnGroundBurst(x: number, y: number): void {
    this.spawnBurst(x, y, 'ground', 0.14);
  }

  private spawnImpact(x: number, y: number, weapon: WeaponId): void {
    if (weapon === 'missile' || weapon === 'flak') {
      this.spawnBurst(x, y, 'ground', weapon === 'missile' ? 0.14 : 0.1);
      return;
    }

    if (this.impacts.length >= MAX_IMPACTS) {
      const oldest = this.impacts.shift();
      if (oldest) {
        this.releaseImpact(oldest.graphic);
      }
    }

    const graphic = this.acquireImpact();
    graphic.clear();
    graphic.circle(0, 0, 4).fill({ color: 0xffe08a, alpha: 0.85 });
    graphic.position.set(x, y);
    graphic.alpha = 1;
    this.view.addChild(graphic);
    this.impacts.push({ age: 0, graphic });
  }

  private spawnBurst(x: number, y: number, kind: 'air' | 'ground', scale: number): void {
    const frames = fxTextures(kind);
    if (frames.length === 0) {
      return;
    }
    while (this.bursts.length >= MAX_BURSTS) {
      const oldest = this.bursts.shift();
      oldest?.sprite.destroy();
    }
    const sprite = new Sprite(frames[0]);
    sprite.anchor.set(0.5);
    sprite.scale.set(scale);
    sprite.blendMode = 'add';
    sprite.position.set(x, y);
    this.view.addChild(sprite);
    this.bursts.push({ age: 0, frames, sprite });
  }

  private acquireShot(weapon: WeaponId, color: number): Graphics {
    const graphic = this.shotPool.pop() ?? new Graphics();
    graphic.clear();
    graphic.visible = true;
    graphic.alpha = 1;
    if (weapon === 'artillery') {
      graphic.rect(-1, -7, 2, 14).fill({ color: 0xffe08a });
    } else if (weapon === 'missile') {
      graphic.roundRect(-2.5, -9, 5, 18, 1.5).fill({ color });
    } else {
      graphic.rect(-1.5, -6, 3, 12).fill({ color });
      graphic.circle(0, 0, 2.5).fill({ color: 0xd0ecff, alpha: 0.85 });
    }
    return graphic;
  }

  private releaseShot(graphic: Graphics): void {
    graphic.removeFromParent();
    graphic.visible = false;
    if (this.shotPool.length < 48) {
      this.shotPool.push(graphic);
    } else {
      graphic.destroy();
    }
  }

  private acquireImpact(): Graphics {
    return this.impactPool.pop() ?? new Graphics();
  }

  private releaseImpact(graphic: Graphics): void {
    graphic.removeFromParent();
    graphic.clear();
    if (this.impactPool.length < 24) {
      this.impactPool.push(graphic);
    } else {
      graphic.destroy();
    }
  }

  private drawGun(force = false): void {
    const key = `${this.gunX.toFixed(1)}:${this.gunY.toFixed(1)}:${this.aim.toFixed(2)}:${this.selected}:${this.overheated}`;
    if (!force && key === this.lastGunKey) {
      return;
    }
    this.lastGunKey = key;

    this.gun.clear();
    this.gun.position.set(this.gunX, this.gunY);
    this.gun.roundRect(-16, -6, 32, 14, 4).fill({ color: 0x2a3238 });
    this.gun.roundRect(-12, -10, 24, 8, 3).fill({ color: 0x3d4a52 });

    const barrel = this.overheated ? 0xff4a3a : WEAPONS[this.selected].color;
    this.gun
      .moveTo(0, 0)
      .lineTo(Math.cos(this.aim) * 28, Math.sin(this.aim) * 28)
      .stroke({ width: 5, color: barrel, alpha: 0.95 });
    this.gun.circle(0, 0, 5).fill({ color: 0xd6e2ea });
  }
}
