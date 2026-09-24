import { Container, Graphics } from 'pixi.js';

import type { WeaponId } from '../defense/weapons';
import { DefenseSystem } from '../defense/DefenseSystem';
import { theme } from '../theme';
import { Threat } from '../threats/Threat';
import { ThreatSpawner } from '../threats/ThreatSpawner';
import { City } from '../world/City';
import { CloudLayer } from '../world/CloudLayer';
import { InfoBar } from '../world/InfoBar';
import { Sky } from '../world/Sky';
import type { Scene, SceneContext } from './Scene';

const WEAPON_KEYS: Record<string, WeaponId> = {
  Digit1: 'long',
  Digit2: 'short',
  Digit3: 'drone',
  '1': 'long',
  '2': 'short',
  '3': 'drone',
};

export class GameScene implements Scene {
  readonly name = 'game';
  readonly view = new Container();

  private readonly sky = new Sky();
  private readonly clouds = new CloudLayer();
  private readonly rangeGuide = new Graphics();
  private readonly city = new City();
  private readonly defenses = new DefenseSystem();
  private readonly info = new InfoBar();
  private readonly threatLayer = new Container();
  private readonly spawner = new ThreatSpawner();
  private threats: Threat[] = [];

  private elapsed = 0;
  private alert = false;
  private alertBlend = 0;
  private downed = 0;
  private hits = 0;
  private width = 0;
  private height = 0;

  constructor() {
    this.info.bindIcons();
    this.view.addChild(
      this.sky.view,
      this.clouds.view,
      this.rangeGuide,
      this.city.view,
      this.threatLayer,
      this.defenses.view,
      this.info.view,
    );
  }

  enter(context: SceneContext): void {
    this.elapsed = 0;
    this.alert = false;
    this.alertBlend = 0;
    this.downed = 0;
    this.hits = 0;
    this.clearThreats();
    this.spawner.reset();
    this.city.siren.setActive(false);
    this.rebuild(context.width, context.height, true);
  }

  exit(): void {
    this.clearThreats();
  }

  update(deltaMs: number, context: SceneContext): void {
    if (context.input.wasPressed('Escape')) {
      context.goto('menu');
      return;
    }

    for (const [key, weapon] of Object.entries(WEAPON_KEYS)) {
      if (context.input.wasPressed(key)) {
        this.defenses.select(weapon);
      }
    }

    this.elapsed += deltaMs;

    if (!this.alert && this.elapsed >= theme.layout.peacefulMs) {
      this.alert = true;
      this.city.siren.setActive(true);
    }

    const blendTarget = this.alert ? 1 : 0;
    const previousBlend = this.alertBlend;
    this.alertBlend += (blendTarget - this.alertBlend) * Math.min(1, deltaMs / 700);
    if (Math.abs(this.alertBlend - previousBlend) > 0.01) {
      this.sky.setAlertBlend(this.alertBlend);
    }

    this.clouds.update(deltaMs);
    this.city.update(deltaMs);
    this.defenses.update(deltaMs);

    if (this.alert) {
      const spawned = this.spawner.update(deltaMs, {
        width: this.width,
        height: this.height,
        left: this.city.bounds.left,
        right: this.city.bounds.right,
        rooftop: this.city.bounds.rooftop,
      });
      for (const threat of spawned) {
        this.threats.push(threat);
        this.threatLayer.addChild(threat.view);
      }
    }

    const pointer = context.input.pointer;
    if (pointer.clicked) {
      if (this.info.contains(pointer.x, pointer.y)) {
        const weapon = this.info.hitWeapon(pointer.x, pointer.y);
        if (weapon) {
          this.defenses.select(weapon);
        }
      } else if (pointer.y < this.city.bounds.infoTop) {
        this.defenses.tryFire(pointer.x, pointer.y);
      }
    }

    for (const threat of this.threats) {
      threat.update(deltaMs);
    }

    const closeY = this.city.bounds.infoTop * theme.layout.closeRangeRatio;
    this.downed += this.defenses.consumeHits(this.threats, closeY);

    this.threats = this.threats.filter((threat) => {
      if (threat.alive) {
        return true;
      }
      if (threat.hitCity) {
        this.hits += 1;
      }
      threat.view.destroy();
      return false;
    });

    this.syncHud();
  }

  resize(width: number, height: number): void {
    this.rebuild(width, height, false);
  }

  debugState(): unknown {
    return {
      scene: this.name,
      elapsed: Math.round(this.elapsed),
      alert: this.alert,
      alertBlend: Number(this.alertBlend.toFixed(2)),
      width: this.width,
      height: this.height,
      ammo: { ...this.defenses.ammo },
      selected: this.defenses.selected,
      downed: this.downed,
      hits: this.hits,
      threats: this.threats.map((threat) => ({
        kind: threat.kind,
        phase: threat.phase,
        x: Math.round(threat.x),
        y: Math.round(threat.y),
        hp: threat.hp,
      })),
    };
  }

  destroy(): void {
    this.clearThreats();
    this.view.destroy({ children: true });
  }

  private rebuild(width: number, height: number, resetDefense: boolean): void {
    this.width = width;
    this.height = height;
    this.sky.setAlertBlend(this.alertBlend);
    this.sky.resize(width, height);
    this.clouds.rebuild(width, height * 0.55);
    this.city.rebuild(width, height);
    if (resetDefense) {
      this.defenses.reset(this.city.batteryOrigins);
    } else {
      this.defenses.layout(this.city.batteryOrigins);
    }
    this.info.resize(width, height);
    this.drawOverlays(width);
    this.syncHud();
  }

  private drawOverlays(width: number): void {
    const closeY = this.city.bounds.infoTop * theme.layout.closeRangeRatio;
    this.rangeGuide.clear();
    this.rangeGuide.rect(0, closeY, width, 1).fill({ color: 0xffffff, alpha: 0.08 });
  }

  private syncHud(): void {
    this.info.setState({
      selected: this.defenses.selected,
      ammo: this.defenses.ammo,
      downed: this.downed,
      hits: this.hits,
    });
  }

  private clearThreats(): void {
    for (const threat of this.threats) {
      threat.view.destroy();
    }
    this.threats = [];
    this.threatLayer.removeChildren();
  }
}
