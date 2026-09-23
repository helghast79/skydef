import { Container, Graphics } from 'pixi.js';

type Cloud = {
  graphic: Graphics;
  x: number;
  y: number;
  speed: number;
  scale: number;
  width: number;
};

export class CloudLayer {
  readonly view = new Container();
  private clouds: Cloud[] = [];
  private width = 0;
  private height = 0;

  rebuild(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.view.removeChildren();
    this.clouds = [];

    const count = Math.max(6, Math.round(width / 220));
    for (let i = 0; i < count; i += 1) {
      const scale = 0.55 + Math.random() * 0.7;
      const graphic = this.drawCloud(scale);
      const cloud: Cloud = {
        graphic,
        x: Math.random() * (width + 200) - 100,
        y: height * (0.08 + Math.random() * 0.32),
        speed: 8 + Math.random() * 18,
        scale,
        width: graphic.width,
      };
      graphic.position.set(cloud.x, cloud.y);
      this.clouds.push(cloud);
      this.view.addChild(graphic);
    }
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > this.width + cloud.width) {
        cloud.x = -cloud.width - 40;
        cloud.y = this.height * (0.08 + Math.random() * 0.32);
      }
      cloud.graphic.position.set(cloud.x, cloud.y);
    }
  }

  private drawCloud(scale: number): Graphics {
    const graphic = new Graphics();
    const puffs = [
      { x: 0, y: 8, r: 18 },
      { x: 22, y: 0, r: 26 },
      { x: 48, y: 6, r: 20 },
      { x: 70, y: 12, r: 16 },
      { x: 28, y: 16, r: 18 },
    ];

    for (const puff of puffs) {
      graphic.circle(puff.x * scale, puff.y * scale, puff.r * scale).fill({
        color: 0xffffff,
        alpha: 0.55,
      });
    }

    return graphic;
  }
}
