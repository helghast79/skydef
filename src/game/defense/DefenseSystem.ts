import { Container, Graphics } from 'pixi.js';

import type { BatteryOrigins } from '../world/City';
import type { Threat } from '../threats/Threat';
import type { WeaponId } from './weapons';
import { WEAPON_IDS, WEAPONS } from './weapons';

type Interceptor = {
  weapon: WeaponId;
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
  weapon: WeaponId;
  x: number;
  y: number;
  age: number;
  graphic: Graphics;
};

export class DefenseSystem {
  readonly view = new Container();
  selected: WeaponId = 'mid';
  ammo: Record<WeaponId, number> = {
    upper: WEAPONS.upper.startAmmo,
    mid: WEAPONS.mid.startAmmo,
    short: WEAPONS.short.startAmmo,
    drone: WEAPONS.drone.startAmmo,
  };

  private origins: BatteryOrigins = {
    upper: { x: 0, y: 0 },
    mid: { x: 0, y: 0 },
    short: { x: 0, y: 0 },
    drone: { x: 0, y: 0 },
  };
  private readonly turrets = new Graphics();
  private interceptors: Interceptor[] = [];
  private bursts: Burst[] = [];
  private regenMs: Record<WeaponId, number> = {
    upper: 0,
    mid: 0,
    short: 0,
    drone: 0,
  };

  constructor() {
    this.view.addChild(this.turrets);
  }

  reset(origins: BatteryOrigins): void {
    for (const id of WEAPON_IDS) {
      this.ammo[id] = WEAPONS[id].startAmmo;
      this.regenMs[id] = 0;
    }
    this.selected = 'mid';
    for (const interceptor of this.interceptors) {
      interceptor.graphic.destroy();
    }
    for (const burst of this.bursts) {
      burst.graphic.destroy();
    }
    this.interceptors = [];
    this.bursts = [];
    this.layout(origins);
  }

  layout(origins: BatteryOrigins): void {
    this.origins = origins;
    this.drawTurrets();
  }

  select(weapon: WeaponId): void {
    this.selected = weapon;
  }

  tryFire(x: number, y: number, threats: Threat[]): boolean {
    const weapon = this.selected;
    if (this.ammo[weapon] <= 0) {
      return false;
    }

    let destX = x;
    let destY = y;
    if (weapon === 'upper') {
      const inbound = this.nearestSpaceBallistic(x, y, threats);
      if (inbound) {
        destX = inbound.x;
        destY = inbound.y;
      }
    }

    const origin = this.origins[weapon];
    const dx = destX - origin.x;
    const dy = destY - origin.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = WEAPONS[weapon].speed;

    const graphic = new Graphics();
    this.view.addChild(graphic);
    this.interceptors.push({
      weapon,
      x: origin.x,
      y: origin.y,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      destX,
      destY,
      alive: true,
      graphic,
    });
    this.ammo[weapon] -= 1;
    return true;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;

    for (const id of WEAPON_IDS) {
      if (this.ammo[id] >= WEAPONS[id].maxAmmo) {
        this.regenMs[id] = 0;
        continue;
      }
      this.regenMs[id] += deltaMs;
      if (this.regenMs[id] >= WEAPONS[id].regenMs) {
        this.ammo[id] = Math.min(WEAPONS[id].maxAmmo, this.ammo[id] + WEAPONS[id].regenAmount);
        this.regenMs[id] = 0;
      }
    }

    for (const interceptor of this.interceptors) {
      interceptor.x += interceptor.vx * dt;
      interceptor.y += interceptor.vy * dt;
      interceptor.graphic.clear();
      interceptor.graphic.circle(0, 0, interceptor.weapon === 'upper' ? 4 : 3).fill({
        color: WEAPONS[interceptor.weapon].color,
      });
      interceptor.graphic.position.set(interceptor.x, interceptor.y);

      if (Math.hypot(interceptor.x - interceptor.destX, interceptor.y - interceptor.destY) < 12) {
        interceptor.alive = false;
        this.spawnBurst(interceptor.weapon, interceptor.x, interceptor.y);
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
        color: WEAPONS[burst.weapon].color,
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

  consumeHits(threats: Threat[], closeY: number): number {
    let downed = 0;
    for (const burst of this.bursts) {
      const reach = WEAPONS[burst.weapon].blastRadius + burst.age * 40;
      for (const threat of threats) {
        if (!threat.alive || !this.canEngage(burst.weapon, threat, closeY)) {
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

  private canEngage(weapon: WeaponId, threat: Threat, closeY: number): boolean {
    if (weapon === 'upper') {
      return threat.kind === 'ballistic' && threat.phase === 'space';
    }
    if (weapon === 'drone') {
      return threat.kind === 'drone' && threat.phase === 'air';
    }
    if (weapon === 'mid') {
      return (
        (threat.kind === 'ballistic' || threat.kind === 'cruise') &&
        threat.phase === 'air' &&
        threat.y < closeY
      );
    }
    return threat.phase === 'air' && threat.y >= closeY;
  }

  private nearestSpaceBallistic(x: number, y: number, threats: Threat[]): Threat | null {
    let best: Threat | null = null;
    let bestDist = Infinity;
    for (const threat of threats) {
      if (threat.kind !== 'ballistic' || threat.phase !== 'space' || !threat.alive) {
        continue;
      }
      const dist = Math.hypot(threat.x - x, threat.y - y);
      if (dist < bestDist) {
        best = threat;
        bestDist = dist;
      }
    }
    return best;
  }

  private spawnBurst(weapon: WeaponId, x: number, y: number): void {
    const graphic = new Graphics();
    this.view.addChild(graphic);
    this.bursts.push({ weapon, x, y, age: 0, graphic });
  }

  private drawTurrets(): void {
    this.turrets.clear();
    for (const id of WEAPON_IDS) {
      const battery = this.origins[id];
      const color = WEAPONS[id].color;
      this.turrets.rect(battery.x - 7, battery.y - 5, 14, 5).fill({ color: 0x1c221c });
      this.turrets.rect(battery.x - 2, battery.y - 14, 4, 11).fill({ color });
    }
  }
}
