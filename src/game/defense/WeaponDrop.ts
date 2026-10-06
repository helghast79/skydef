import { Container, Graphics, Sprite, Text } from 'pixi.js';

import type { WeaponId } from '../defense/weapons';
import { WEAPONS } from '../defense/weapons';
import { parachuteTexture } from '../sprites';

export class WeaponDrop {
  readonly view = new Container();
  readonly weapon: WeaponId;
  readonly ammo: number;
  x: number;
  y: number;
  done = false;
  collected = false;

  private readonly chute: Sprite;
  private readonly crate = new Graphics();
  private readonly label: Text;
  private readonly targetY: number;
  private readonly swayPhase: number;
  private age = 0;

  constructor(options: {
    weapon: WeaponId;
    ammo: number;
    startX: number;
    startY: number;
    targetY: number;
  }) {
    this.weapon = options.weapon;
    this.ammo = options.ammo;
    this.x = options.startX;
    this.y = options.startY;
    this.targetY = options.targetY;
    this.swayPhase = Math.random() * Math.PI * 2;

    this.chute = new Sprite(parachuteTexture());
    this.chute.anchor.set(0.5, 1);
    this.chute.scale.set(0.028);
    this.chute.roundPixels = false;

    const color = WEAPONS[options.weapon].color;
    this.crate.roundRect(-10, 0, 20, 14, 2).fill({ color: 0x2a2418 });
    this.crate.roundRect(-10, 0, 20, 14, 2).stroke({ width: 1.5, color });
    this.crate.moveTo(0, -2).lineTo(0, -18).stroke({ width: 1, color: 0xd6e2ea, alpha: 0.7 });

    this.label = new Text({
      text: WEAPONS[options.weapon].label,
      style: {
        fontFamily: '"Courier New", monospace',
        fontSize: 11,
        fill: color,
      },
    });
    this.label.anchor.set(0.5, 0);
    this.label.position.set(0, 16);

    this.view.addChild(this.chute, this.crate, this.label);
    this.view.position.set(this.x, this.y);
  }

  update(deltaMs: number): void {
    if (this.done) {
      return;
    }
    const dt = deltaMs / 1000;
    this.age += dt;

    this.y += 42 * dt;
    this.x += Math.sin(this.age * 1.6 + this.swayPhase) * 18 * dt;
    if (this.y >= this.targetY) {
      this.y = this.targetY;
      this.collected = true;
      this.done = true;
    }

    this.chute.rotation = Math.sin(this.age * 1.6 + this.swayPhase) * 0.08;
    this.view.position.set(this.x, this.y);
  }
}
