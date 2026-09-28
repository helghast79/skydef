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
const JAMMER_FILL = 0x1a4a7a;

export class DefenseSystem {
  readonly view = new Container();
  selected: WeaponId = 'missile';
  ammo: Record<WeaponId, number> = {
    missile: WEAPONS.missile.startAmmo,
    jammer: WEAPONS.jammer.startAmmo,
  };

  private effects: Effect[] = [];
  private regenMs: Record<WeaponId, number> = {
    missile: 0,
    jammer: 0,
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
    const weapon = this.selected;
    if (this.ammo[weapon] <= 0) {
      return false;
    }

    const graphic = new Graphics();
    graphic.position.set(x, y);
    this.view.addChild(graphic);
    this.effects.push({ weapon, x, y, age: 0, graphic });
    this.drawEffect(this.effects[this.effects.length - 1]);
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

    for (const effect of this.effects) {
      effect.age += dt;
      this.drawEffect(effect);
    }

    this.effects = this.effects.filter((effect) => {
      if (effect.age < WEAPONS[effect.weapon].duration) {
        return true;
      }
      effect.graphic.destroy();
      return false;
    });
  }

  consumeHits(threats: Threat[], deltaMs: number): number {
    let downed = 0;
    const dt = deltaMs / 1000;
    const insideJammer = new Set<Threat>();

    for (const effect of this.effects) {
      const radius = this.radiusOf(effect);
      for (const threat of threats) {
        if (!threat.alive || threat.phase !== 'air') {
          continue;
        }
        if (Math.hypot(threat.x - effect.x, threat.y - effect.y) >= radius + threat.radius) {
          continue;
        }
        if (effect.weapon === 'missile' && threat.kind !== 'drone') {
          if (threat.takeHit()) {
            downed += 1;
          }
        }
        if (effect.weapon === 'jammer' && threat.kind === 'drone') {
          insideJammer.add(threat);
        }
      }
    }

    for (const threat of threats) {
      if (threat.kind !== 'drone' || !threat.alive) {
        continue;
      }
      if (threat.dwellInJammer(insideJammer.has(threat), dt)) {
        downed += 1;
      }
    }

    return downed;
  }

  private radiusOf(effect: Effect): number {
    const def = WEAPONS[effect.weapon];
    if (effect.weapon === 'jammer') {
      return def.radius;
    }
    const t = Math.min(1, effect.age / def.duration);
    const eased = 1 - (1 - t) * (1 - t);
    return 16 + (def.radius - 16) * eased;
  }

  private drawEffect(effect: Effect): void {
    const radius = this.radiusOf(effect);
    effect.graphic.clear();

    if (effect.weapon === 'missile') {
      const fade = Math.max(0, 1 - effect.age / WEAPONS.missile.duration);
      effect.graphic.circle(0, 0, radius).fill({
        color: MISSILE_FILL,
        alpha: 0.3 * fade,
      });
      return;
    }

    effect.graphic.circle(0, 0, radius).fill({ color: JAMMER_FILL, alpha: 0.16 });
    effect.graphic.circle(0, 0, radius).stroke({ width: 2.5, color: WEAPONS.jammer.color, alpha: 0.95 });
  }
}
