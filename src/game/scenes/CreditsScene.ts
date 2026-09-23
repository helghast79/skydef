import { Container, Graphics, Text } from 'pixi.js';

import { theme } from '../theme';
import type { Scene, SceneContext } from './Scene';

const LINES = [
  'CITY DEFENSE',
  '',
  'A 2D island city under fire.',
  'You command a limited battery',
  'against bombs, drones, ballistic',
  'and cruise missiles.',
  '',
  'Scaffold build — systems and',
  'balance still to come.',
  '',
  'Art and audio are placeholders.',
];

export class CreditsScene implements Scene {
  readonly name = 'credits';
  readonly view = new Container();

  private readonly backdrop = new Graphics();
  private readonly title = new Text({
    text: 'CREDITS',
    style: {
      fontFamily: theme.fonts.title,
      fontSize: 48,
      fill: theme.colors.menuTitle,
      letterSpacing: 10,
    },
  });
  private readonly body = new Text({
    text: LINES.join('\n'),
    style: {
      fontFamily: theme.fonts.mono,
      fontSize: 18,
      fill: theme.colors.menuIdle,
      align: 'center',
      lineHeight: 28,
      letterSpacing: 0,
    },
  });
  private readonly hint = new Text({
    text: 'ENTER / SPACE / ESC  RETURN',
    style: {
      fontFamily: theme.fonts.mono,
      fontSize: 13,
      fill: 0x5a6a78,
      letterSpacing: 2,
    },
  });

  constructor() {
    this.view.addChild(this.backdrop, this.title, this.body, this.hint);
  }

  enter(): void {}

  exit(): void {}

  update(_deltaMs: number, context: SceneContext): void {
    if (context.input.wasPressed('Enter', 'Space', 'Escape')) {
      context.goto('menu');
    }
  }

  resize(width: number, height: number): void {
    this.backdrop.clear();
    this.backdrop.rect(0, 0, width, height).fill({ color: theme.colors.menuBg });

    this.title.anchor.set(0.5, 0.5);
    this.title.position.set(width / 2, height * 0.22);

    this.body.anchor.set(0.5, 0.5);
    this.body.position.set(width / 2, height * 0.5);

    this.hint.anchor.set(0.5, 0.5);
    this.hint.position.set(width / 2, height * 0.82);
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
