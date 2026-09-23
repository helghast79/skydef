import { Container, Graphics, Text } from 'pixi.js';

import { theme } from '../theme';

export class InfoBar {
  readonly view = new Container();
  private readonly panel = new Graphics();
  private readonly left = new Text({
    text: '',
    style: {
      fontFamily: theme.fonts.mono,
      fontSize: 15,
      fill: 0xd6e2ea,
    },
  });
  private readonly center = new Text({
    text: '',
    style: {
      fontFamily: theme.fonts.mono,
      fontSize: 15,
      fill: theme.colors.menuActive,
    },
  });
  private readonly right = new Text({
    text: '',
    style: {
      fontFamily: theme.fonts.mono,
      fontSize: 15,
      fill: 0xd6e2ea,
    },
  });

  constructor() {
    this.view.addChild(this.panel, this.left, this.center, this.right);
  }

  resize(width: number, height: number): void {
    const barHeight = theme.layout.infoBarHeight;
    const y = height - barHeight;

    this.panel.clear();
    this.panel.rect(0, y, width, barHeight).fill({ color: theme.colors.hudBg });
    this.panel.rect(0, y, width, 2).fill({ color: theme.colors.hudLine });

    this.left.anchor.set(0, 0.5);
    this.left.position.set(18, y + barHeight / 2);

    this.center.anchor.set(0.5, 0.5);
    this.center.position.set(width / 2, y + barHeight / 2);

    this.right.anchor.set(1, 0.5);
    this.right.position.set(width - 18, y + barHeight / 2);
  }

  setStats(stats: { ammo: number; downed: number; hits: number; status: string }): void {
    this.left.text = `AMMO  ${stats.ammo}     DOWNED  ${stats.downed}`;
    this.center.text = stats.status;
    this.right.text = `CITY HITS  ${stats.hits}     CLICK TO FIRE     ESC  MENU`;
  }
}
