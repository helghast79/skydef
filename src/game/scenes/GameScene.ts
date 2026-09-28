import { Container } from 'pixi.js';

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
  Digit1: 'missile',
  Digit2: 'jammer',
  '1': 'missile',
  '2': 'jammer',
};

export class GameScene implements Scene {
  readonly name = 'game';
  readonly view = new Container();

  private readonly sky = new Sky();
  private readonly clouds = new CloudLayer();
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

    this.downed += this.defenses.consumeHits(this.threats, deltaMs);

    this.threats = this.threats.filter((threat) => {
      if (threat.claimCityHit()) {
        this.hits += 1;
      }
      if (!threat.done) {
        return true;
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
        done: threat.done,
        alive: threat.alive,
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
      this.defenses.reset();
    }
    this.info.resize(width, height);
    this.syncHud();
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
