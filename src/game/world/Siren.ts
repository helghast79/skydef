import { Container, Graphics } from 'pixi.js';

import { theme } from '../theme';

export class Siren {
  readonly view = new Container();
  private readonly mast = new Graphics();
  private readonly lamp = new Graphics();
  private readonly beam = new Graphics();
  private angle = 0;
  private active = false;

  constructor() {
    this.view.addChild(this.beam, this.mast, this.lamp);
  }

  place(x: number, y: number): void {
    this.view.position.set(x, y);
  }

  setActive(active: boolean): void {
    this.active = active;
    this.beam.visible = active;
  }

  update(deltaMs: number): void {
    this.mast.clear();
    this.mast.rect(-2, -28, 4, 28).fill({ color: 0x222830 });
    this.mast.rect(-6, -6, 12, 6).fill({ color: 0x333b46 });

    const pulse = this.active ? 0.55 + Math.sin(this.angle * 3) * 0.45 : 0.2;
    this.lamp.clear();
    this.lamp.circle(0, -32, 6).fill({ color: theme.colors.siren, alpha: 0.25 + pulse * 0.75 });
    this.lamp.circle(0, -32, 3).fill({ color: 0xffd0d0 });

    if (!this.active) {
      return;
    }

    this.angle += (deltaMs / 1000) * 2.4;
    this.beam.clear();
    this.beam.moveTo(0, -32);
    this.beam.arc(0, -32, 90, this.angle - 0.35, this.angle + 0.35);
    this.beam.lineTo(0, -32);
    this.beam.fill({ color: theme.colors.siren, alpha: 0.18 });
  }
}
