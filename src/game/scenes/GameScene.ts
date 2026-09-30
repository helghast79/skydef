import { Container, Graphics, Text } from 'pixi.js';

import { DefenseSystem } from '../defense/DefenseSystem';
import { CITY_DAMAGE } from '../scoring';
import { theme } from '../theme';
import { Threat } from '../threats/Threat';
import { ThreatSpawner } from '../threats/ThreatSpawner';
import { City } from '../world/City';
import { CloudLayer } from '../world/CloudLayer';
import { InfoBar } from '../world/InfoBar';
import { Sky } from '../world/Sky';
import type { Scene, SceneContext } from './Scene';

export class GameScene implements Scene {
  readonly name = 'game';
  readonly view = new Container();

  private readonly sky = new Sky();
  private readonly clouds = new CloudLayer();
  private readonly city = new City();
  private readonly defenses = new DefenseSystem();
  private readonly info = new InfoBar();
  private readonly threatLayer = new Container();
  private readonly overlay = new Container();
  private readonly overlayPanel = new Graphics();
  private readonly overlayTitle = new Text({
    text: 'CITY LOST',
    style: {
      fontFamily: theme.fonts.title,
      fontSize: 56,
      fill: 0xff6a4a,
      letterSpacing: 6,
    },
  });
  private readonly overlayScore = new Text({
    text: '',
    style: {
      fontFamily: theme.fonts.mono,
      fontSize: 18,
      fill: 0xffe08a,
    },
  });
  private readonly overlayHint = new Text({
    text: 'ESC  RETURN TO MENU',
    style: {
      fontFamily: theme.fonts.mono,
      fontSize: 14,
      fill: 0x8a9aaa,
      letterSpacing: 2,
    },
  });
  private readonly spawner = new ThreatSpawner();
  private threats: Threat[] = [];

  private elapsed = 0;
  private alert = false;
  private alertBlend = 0;
  private score = 0;
  private health = 100;
  private gameOver = false;
  private width = 0;
  private height = 0;

  constructor() {
    this.info.bindIcons();
    this.overlayTitle.anchor.set(0.5);
    this.overlayScore.anchor.set(0.5);
    this.overlayHint.anchor.set(0.5);
    this.overlay.addChild(this.overlayPanel, this.overlayTitle, this.overlayScore, this.overlayHint);
    this.overlay.visible = false;
    this.view.addChild(
      this.sky.view,
      this.clouds.view,
      this.city.view,
      this.threatLayer,
      this.defenses.view,
      this.info.view,
      this.overlay,
    );
  }

  enter(context: SceneContext): void {
    this.elapsed = 0;
    this.alert = false;
    this.alertBlend = 0;
    this.score = 0;
    this.health = 100;
    this.gameOver = false;
    this.overlay.visible = false;
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

    if (this.gameOver) {
      this.syncHud();
      return;
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
        this.addThreat(threat);
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
      while (threat.spawned.length > 0) {
        const child = threat.spawned.shift();
        if (child) {
          this.addThreat(child);
        }
      }
    }

    for (const kill of this.defenses.consumeHits(this.threats)) {
      this.score += kill.points;
    }

    this.threats = this.threats.filter((threat) => {
      if (threat.claimCityHit()) {
        this.health = Math.max(0, this.health - CITY_DAMAGE[threat.scoreKind]);
        if (this.health <= 0) {
          this.triggerGameOver();
        }
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
      score: this.score,
      health: this.health,
      gameOver: this.gameOver,
      ammo: { ...this.defenses.ammo },
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

  private addThreat(threat: Threat): void {
    this.threats.push(threat);
    this.threatLayer.addChild(threat.view);
  }

  private triggerGameOver(): void {
    if (this.gameOver) {
      return;
    }
    this.gameOver = true;
    this.city.siren.setActive(false);
    this.overlayScore.text = `FINAL SCORE  ${this.score}`;
    this.overlay.visible = true;
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
    this.overlayPanel.clear();
    this.overlayPanel.rect(0, 0, width, height).fill({ color: 0x05080c, alpha: 0.72 });
    this.overlayTitle.position.set(width / 2, height * 0.4);
    this.overlayScore.position.set(width / 2, height * 0.4 + 58);
    this.overlayHint.position.set(width / 2, height * 0.4 + 100);
    this.syncHud();
  }

  private syncHud(): void {
    this.info.setState({
      selected: this.defenses.selected,
      ammo: this.defenses.ammo,
      score: this.score,
      health: this.health,
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
