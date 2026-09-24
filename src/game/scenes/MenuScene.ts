import { Container, Graphics, Rectangle, Text } from 'pixi.js';

import { theme } from '../theme';
import type { Scene, SceneContext } from './Scene';

const OPTIONS = [
  { id: 'start', label: 'START', target: 'game' },
  { id: 'credits', label: 'CREDITS', target: 'credits' },
] as const;

export class MenuScene implements Scene {
  readonly name = 'menu';
  readonly view = new Container();

  private readonly backdrop = new Graphics();
  private readonly title = new Text({
    text: 'SKYLINE',
    style: {
      fontFamily: theme.fonts.title,
      fontSize: 72,
      fill: theme.colors.menuTitle,
      letterSpacing: 10,
    },
  });
  private readonly subtitle = new Text({
    text: 'LAST LINE OF DEFENSE',
    style: {
      fontFamily: theme.fonts.mono,
      fontSize: 16,
      fill: theme.colors.menuIdle,
      letterSpacing: 4,
    },
  });
  private readonly hint = new Text({
    text: 'CLICK / TAP  OR  ↑ ↓  ENTER / SPACE',
    style: {
      fontFamily: theme.fonts.mono,
      fontSize: 13,
      fill: 0x5a6a78,
      letterSpacing: 2,
    },
  });
  private readonly optionHits: Graphics[] = [];
  private readonly optionTexts: Text[] = [];
  private readonly cursor = new Graphics();
  private selected = 0;
  private pulse = 0;
  private pendingTarget: string | null = null;

  constructor() {
    this.backdrop.eventMode = 'none';
    this.title.eventMode = 'none';
    this.subtitle.eventMode = 'none';
    this.hint.eventMode = 'none';
    this.cursor.eventMode = 'none';
    this.view.addChild(this.backdrop, this.title, this.subtitle, this.hint, this.cursor);

    OPTIONS.forEach((option, index) => {
      const hit = new Graphics();
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.on('pointerover', () => {
        this.selected = index;
        this.refreshSelection();
      });
      hit.on('pointerdown', () => {
        this.selected = index;
        this.pendingTarget = option.target;
      });
      this.optionHits.push(hit);
      this.view.addChild(hit);

      const text = new Text({
        text: option.label,
        style: {
          fontFamily: theme.fonts.mono,
          fontSize: 28,
          fill: theme.colors.menuIdle,
          letterSpacing: 4,
        },
      });
      text.eventMode = 'none';
      this.optionTexts.push(text);
      this.view.addChild(text);
    });
  }

  enter(): void {
    this.selected = 0;
    this.pulse = 0;
    this.pendingTarget = null;
    this.refreshSelection();
  }

  exit(): void {
    this.pendingTarget = null;
  }

  update(deltaMs: number, context: SceneContext): void {
    const { input } = context;

    if (input.wasPressed('ArrowUp', 'KeyW')) {
      this.selected = (this.selected - 1 + OPTIONS.length) % OPTIONS.length;
      this.refreshSelection();
    }

    if (input.wasPressed('ArrowDown', 'KeyS')) {
      this.selected = (this.selected + 1) % OPTIONS.length;
      this.refreshSelection();
    }

    if (this.pendingTarget) {
      const target = this.pendingTarget;
      this.pendingTarget = null;
      context.goto(target);
      return;
    }

    if (input.pointer.clicked) {
      const tapped = this.hitOption(input.pointer.x, input.pointer.y);
      if (tapped !== null) {
        this.selected = tapped;
        context.goto(OPTIONS[tapped].target);
        return;
      }
    }

    if (input.wasPressed('Enter', 'Space')) {
      context.goto(OPTIONS[this.selected].target);
    }

    this.pulse += deltaMs / 1000;
    const glow = 0.65 + Math.sin(this.pulse * 4) * 0.35;
    this.cursor.alpha = glow;
    this.optionTexts[this.selected].alpha = 0.75 + glow * 0.25;
  }

  resize(width: number, height: number): void {
    this.drawBackdrop(width, height);

    this.title.anchor.set(0.5, 0.5);
    this.title.position.set(width / 2, height * 0.28);

    this.subtitle.anchor.set(0.5, 0.5);
    this.subtitle.position.set(width / 2, height * 0.28 + 52);

    const startY = height * 0.5;
    const hitWidth = Math.min(420, width * 0.7);
    const hitHeight = 72;
    this.optionTexts.forEach((text, index) => {
      text.anchor.set(0.5, 0.5);
      text.position.set(width / 2, startY + index * 70);

      const hit = this.optionHits[index];
      hit.clear();
      hit.rect(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight).fill({ color: 0xffffff, alpha: 0.001 });
      hit.position.set(width / 2, startY + index * 70);
      hit.hitArea = new Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight);
    });

    this.hint.anchor.set(0.5, 0.5);
    this.hint.position.set(width / 2, height * 0.82);

    this.refreshSelection();
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }

  private hitOption(x: number, y: number): number | null {
    for (let index = 0; index < this.optionHits.length; index += 1) {
      const bounds = this.optionHits[index].getBounds();
      if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
        return index;
      }
    }
    return null;
  }

  private refreshSelection(): void {
    this.optionTexts.forEach((text, index) => {
      const active = index === this.selected;
      text.style.fill = active ? theme.colors.menuActive : theme.colors.menuIdle;
      text.alpha = active ? 1 : 0.85;
    });

    const selected = this.optionTexts[this.selected];
    this.cursor.clear();
    this.cursor.rect(0, 0, 10, 10).fill({ color: theme.colors.menuActive });
    this.cursor.position.set(selected.x - selected.width / 2 - 28, selected.y);
    this.cursor.pivot.set(5, 5);
    this.cursor.rotation = Math.PI / 4;
  }

  private drawBackdrop(width: number, height: number): void {
    this.backdrop.clear();
    this.backdrop.rect(0, 0, width, height).fill({ color: theme.colors.menuBg });

    const horizon = height * 0.72;
    this.backdrop.rect(0, horizon, width, height - horizon).fill({ color: 0x0d1a22 });

    let x = width * 0.08;
    while (x < width * 0.92) {
      const w = 18 + ((x * 13) % 42);
      const h = 40 + ((x * 7) % 90);
      this.backdrop.rect(x, horizon - h, w, h).fill({ color: 0x121c26, alpha: 0.9 });
      x += w + 6;
    }

    this.backdrop.rect(0, height * 0.72 - 2, width, 2).fill({ color: 0x1e2c38 });
  }
}
