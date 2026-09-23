import { Container, Graphics } from 'pixi.js';

import { theme } from '../theme';
import { Siren } from './Siren';

export type Building = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
};

export class City {
  readonly view = new Container();
  readonly siren = new Siren();
  readonly buildings: Building[] = [];
  readonly batteryPoints: { x: number; y: number }[] = [];

  private readonly ground = new Graphics();
  private readonly skyline = new Graphics();
  private left = 0;
  private right = 0;
  private rooftop = 0;
  private infoTop = 0;

  constructor() {
    this.view.addChild(this.ground, this.skyline, this.siren.view);
  }

  get bounds() {
    return {
      left: this.left,
      right: this.right,
      rooftop: this.rooftop,
      infoTop: this.infoTop,
    };
  }

  rebuild(width: number, height: number): void {
    const infoTop = height - theme.layout.infoBarHeight;
    const side = Math.max(28, width * theme.layout.sideMarginRatio);
    const landHeight = 16;
    const baseY = infoTop - landHeight;
    const cityHeight = Math.max(90, baseY * theme.layout.cityHeightRatio);

    this.left = side;
    this.right = width - side;
    this.infoTop = infoTop;
    this.rooftop = baseY;
    this.buildings.length = 0;
    this.batteryPoints.length = 0;

    this.drawGround(width, infoTop, side, baseY);
    this.drawBuildings(side, width - side, baseY - cityHeight, baseY);
  }

  update(deltaMs: number): void {
    this.siren.update(deltaMs);
  }

  private drawGround(width: number, infoTop: number, side: number, baseY: number): void {
    this.ground.clear();

    const waterTop = baseY - 22;
    this.ground.rect(0, waterTop, side, infoTop - waterTop).fill({ color: theme.colors.waterDeep });
    this.ground.rect(width - side, waterTop, side, infoTop - waterTop).fill({ color: theme.colors.waterDeep });
    this.ground.rect(0, waterTop + 8, side, 6).fill({ color: theme.colors.water, alpha: 0.45 });
    this.ground.rect(width - side, waterTop + 8, side, 6).fill({ color: theme.colors.water, alpha: 0.45 });

    this.ground.roundRect(side - 12, baseY - 4, width - side * 2 + 24, infoTop - baseY + 4, 10).fill({
      color: theme.colors.land,
    });
    this.ground.rect(side - 4, baseY - 2, width - side * 2 + 8, 7).fill({ color: theme.colors.sand });
    this.ground.rect(side, infoTop - 6, width - side * 2, 6).fill({ color: theme.colors.landEdge });
  }

  private drawBuildings(left: number, right: number, landTop: number, baseY: number): void {
    this.skyline.clear();

    const palette = [theme.colors.buildingDark, theme.colors.buildingMid, theme.colors.buildingLight];
    let x = left + 8;
    let tallest: Building | null = null;

    while (x < right - 20) {
      const remaining = right - 12 - x;
      const width = Math.min(remaining, 22 + Math.round(Math.random() * 36));
      const height = 36 + Math.round(Math.random() * (baseY - landTop - 20));
      const color = palette[Math.floor(Math.random() * palette.length)];
      const y = baseY - height;
      const building: Building = { x, y, width, height, color };
      this.buildings.push(building);

      if (!tallest || building.height > tallest.height) {
        tallest = building;
      }

      this.skyline.rect(x, y, width, height).fill({ color });
      this.skyline.rect(x, y, width, 4).fill({ color: 0x000000, alpha: 0.18 });

      const cols = Math.max(1, Math.floor((width - 6) / 8));
      const rows = Math.max(1, Math.floor((height - 12) / 10));
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const lit = Math.random() > 0.45;
          this.skyline.rect(x + 4 + col * 8, y + 8 + row * 10, 4, 5).fill({
            color: lit ? theme.colors.windowLit : theme.colors.windowDim,
            alpha: lit ? 0.9 : 0.7,
          });
        }
      }

      if (Math.random() > 0.7) {
        this.skyline.rect(x + width * 0.5 - 1, y - 10, 2, 10).fill({ color: 0x222830 });
      }

      x += width + 3;
    }

    const roofs = [...this.buildings].sort((a, b) => b.height - a.height).slice(0, 3);
    for (const roof of roofs) {
      this.batteryPoints.push({
        x: roof.x + roof.width / 2,
        y: roof.y,
      });
    }

    if (tallest) {
      this.siren.place(tallest.x + tallest.width / 2, tallest.y);
    }
  }
}
