import { Container, Graphics } from 'pixi.js';

import type { Threat } from '../threats/Threat';
import type { WeaponId } from './weapons';
import { WEAPON_IDS, WEAPONS } from './weapons';

type Effect = {
  weapon: WeaponId;
  x: number;
  y: number;
  age: number;
  graphic: Graphics;
};

const MISSILE_FILL = 0xff8a3a;

export class DefenseSystem {
  readonly view = new Container();
  selected: WeaponId = 'missile';
  ammo: Record<WeaponId, number> = {
    missile: WEAPONS.missile.startAmmo,
  };

  private effects: Effect[] = [];
  private regenMs: Record<WeaponId, number> = {
    missile: 0,
  };

  reset(): void {
    for (const id of WEAPON_IDS) {
      this.ammo[id] = WEAPONS[id].startAmmo;
      this.regenMs[id] = 0;
    }
    this.selected = 'missile';
    for (const effect of this.effects) {
      effect.graphic.destroy();
    }
    this.effects = [];
  }

  select(weapon: WeaponId): void {
    this.selected = weapon;
  }

  tryFire(x: number, y: number): boolean {
    if (this.ammo.missile <= 0) {
      return false;
    }

    const graphic = new Graphics();
    graphic.position.set(x, y);
    graphic.circle(0, 0, 1).fill({ color: MISSILE_FILL, alpha: 0.3 });
    graphic.scale.set(16);
    this.view.addChild(graphic);
    this.effects.push({ weapon: 'missile', x, y, age: 0, graphic });
    this.ammo.missile -= 1;
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

    for (const effect of this.effects) {
      effect.age += dt;
      const fade = Math.max(0, 1 - effect.age / WEAPONS.missile.duration);
      effect.graphic.position.set(effect.x, effect.y);
      effect.graphic.scale.set(this.radiusOf(effect));
      effect.graphic.alpha = fade;
    }

    this.effects = this.effects.filter((effect) => {
      if (effect.age < WEAPONS.missile.duration) {
        return true;
      }
      effect.graphic.destroy();
      return false;
    });
  }

  consumeHits(threats: Threat[]): number {
    let downed = 0;

    for (const effect of this.effects) {
      const radius = this.radiusOf(effect);
      for (const threat of threats) {
        if (!threat.alive || threat.phase !== 'air') {
          continue;
        }
        if (Math.hypot(threat.x - effect.x, threat.y - effect.y) >= radius + threat.radius) {
          continue;
        }
        if (threat.takeHit()) {
          downed += 1;
        }
      }
    }

    return downed;
  }

  private radiusOf(effect: Effect): number {
    const def = WEAPONS.missile;
    const t = Math.min(1, effect.age / def.duration);
    const eased = 1 - (1 - t) * (1 - t);
    return 16 + (def.radius - 16) * eased;
  }
}
