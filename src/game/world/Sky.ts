import { Container, FillGradient, Graphics } from 'pixi.js';

import { theme } from '../theme';

export class Sky {
  readonly view = new Container();
  private readonly day = new Graphics();
  private readonly night = new Graphics();

  constructor() {
    this.view.addChild(this.day, this.night);
    this.night.alpha = 0;
  }

  setAlertBlend(value: number): void {
    this.night.alpha = Math.max(0, Math.min(1, value));
  }

  resize(width: number, height: number): void {
    this.paint(this.day, width, height, [
      theme.colors.skyTop,
      theme.colors.skyMid,
      theme.colors.skyHorizon,
    ]);
    this.paint(this.night, width, height, [
      theme.colors.alertSkyTop,
      theme.colors.alertSkyMid,
      theme.colors.alertHorizon,
    ]);
  }

  private paint(target: Graphics, width: number, height: number, colors: number[]): void {
    const gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: colors[0] },
        { offset: 0.55, color: colors[1] },
        { offset: 1, color: colors[2] },
      ],
    });

    target.clear();
    target.rect(0, 0, width, height).fill(gradient);
  }
}
