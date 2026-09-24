import { Container, Graphics } from 'pixi.js';

import type { WeaponId } from '../defense/weapons';
import { WEAPON_IDS } from '../defense/weapons';
import { theme } from '../theme';
import { Siren } from './Siren';

export type Building = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
};

export type BatteryOrigins = Record<WeaponId, { x: number; y: number }>;

export class City {
  readonly view = new Container();
  readonly siren = new Siren();
  readonly buildings: Building[] = [];
  batteryOrigins: BatteryOrigins = {
    long: { x: 0, y: 0 },
    short: { x: 0, y: 0 },
    drone: { x: 0, y: 0 },
  };

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
    const cityWidth = width * theme.layout.cityWidthRatio;
    const left = (width - cityWidth) / 2;
    const right = left + cityWidth;
    const landHeight = 14;
    const baseY = infoTop - landHeight;
    const cityHeight = Math.max(72, baseY * theme.layout.cityHeightRatio);

    this.left = left;
    this.right = right;
    this.infoTop = infoTop;
    this.rooftop = baseY;
    this.buildings.length = 0;

    this.drawGround(width, infoTop, left, right, baseY);
    this.drawBuildings(left, right, baseY - cityHeight, baseY);
    this.placeBatteries();
  }

  update(deltaMs: number): void {
    this.siren.update(deltaMs);
  }

  private drawGround(width: number, infoTop: number, left: number, right: number, baseY: number): void {
    this.ground.clear();

    const waterTop = baseY - 22;
    this.ground.rect(0, waterTop, left, infoTop - waterTop).fill({ color: theme.colors.waterDeep });
    this.ground.rect(right, waterTop, width - right, infoTop - waterTop).fill({ color: theme.colors.waterDeep });
    this.ground.rect(0, waterTop + 8, left, 6).fill({ color: theme.colors.water, alpha: 0.45 });
    this.ground.rect(right, waterTop + 8, width - right, 6).fill({ color: theme.colors.water, alpha: 0.45 });

    this.ground.roundRect(left - 12, baseY - 4, right - left + 24, infoTop - baseY + 4, 10).fill({
      color: theme.colors.land,
    });
    this.ground.rect(left - 4, baseY - 2, right - left + 8, 7).fill({ color: theme.colors.sand });
    this.ground.rect(left, infoTop - 6, right - left, 6).fill({ color: theme.colors.landEdge });
  }

  private drawBuildings(left: number, right: number, landTop: number, baseY: number): void {
    this.skyline.clear();

    const scale = theme.layout.buildingScale;
    const palette = [theme.colors.buildingDark, theme.colors.buildingMid, theme.colors.buildingLight];
    let x = left + 6;
    let tallest: Building | null = null;

    while (x < right - 16) {
      const remaining = right - 10 - x;
      const width = Math.min(remaining, Math.round((16 + Math.random() * 28) * scale));
      const height = Math.round((28 + Math.random() * Math.max(24, baseY - landTop - 16)) * scale);
      const color = palette[Math.floor(Math.random() * palette.length)];
      const y = baseY - height;
      const building: Building = { x, y, width, height, color };
      this.buildings.push(building);

      if (!tallest || building.height > tallest.height) {
        tallest = building;
      }

      this.skyline.rect(x, y, width, height).fill({ color });
      this.skyline.rect(x, y, width, 3).fill({ color: 0x000000, alpha: 0.18 });

      const cols = Math.max(1, Math.floor((width - 6) / 8));
      const rows = Math.max(1, Math.floor((height - 10) / 10));
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const lit = Math.random() > 0.45;
          this.skyline.rect(x + 4 + col * 8, y + 7 + row * 10, 4, 5).fill({
            color: lit ? theme.colors.windowLit : theme.colors.windowDim,
            alpha: lit ? 0.9 : 0.7,
          });
        }
      }

      if (Math.random() > 0.75) {
        this.skyline.rect(x + width * 0.5 - 1, y - 8, 2, 8).fill({ color: 0x222830 });
      }

      x += width + 3;
    }

    if (tallest) {
      this.siren.place(tallest.x + tallest.width / 2, tallest.y);
    }
  }

  private placeBatteries(): void {
    const fallback = { x: (this.left + this.right) / 2, y: this.rooftop };
    for (const id of WEAPON_IDS) {
      this.batteryOrigins[id] = { ...fallback };
    }

    if (this.buildings.length === 0) {
      return;
    }

    const byHeight = [...this.buildings].sort((a, b) => b.height - a.height);
    const byX = [...this.buildings].sort((a, b) => a.x - b.x);
    const roof = (building: Building) => ({ x: building.x + building.width / 2, y: building.y });

    this.batteryOrigins.long = roof(byHeight[0]);
    this.batteryOrigins.short = roof(byX[byX.length - 1]);
    this.batteryOrigins.drone = roof(byX[0]);
  }
}
