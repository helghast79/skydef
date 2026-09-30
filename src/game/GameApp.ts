import { Application } from 'pixi.js';

import { loadIcons } from './icons';
import { Input } from './Input';
import { SceneManager } from './SceneManager';
import { loadMissileSprites } from './sprites';
import { CreditsScene } from './scenes/CreditsScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';

export class GameApp {
  private readonly app = new Application();
  private readonly input = new Input();
  private readonly scenes = new SceneManager(this.input);

  async start(): Promise<void> {
    await document.fonts.ready;
    await loadIcons();
    await loadMissileSprites();

    await this.app.init({
      resizeTo: window,
      background: '#071018',
      antialias: true,
      autoDensity: true,
      roundPixels: false,
      resolution: Math.min(window.devicePixelRatio, 2),
      powerPreference: 'high-performance',
    });

    const host = document.querySelector('#app');
    if (!host) {
      throw new Error('Missing #app mount point');
    }
    host.replaceChildren();
    host.appendChild(this.app.canvas);
    this.app.canvas.tabIndex = 0;
    this.app.canvas.focus();

    this.input.attach(window);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointermove', (event) => {
      this.input.setPointer(event.global.x, event.global.y, event.buttons > 0);
    });
    this.app.stage.on('pointerdown', (event) => {
      this.input.markClick(event.global.x, event.global.y);
    });

    this.scenes.register(new MenuScene());
    this.scenes.register(new CreditsScene());
    this.scenes.register(new GameScene());
    this.app.stage.addChild(this.scenes.root);

    const opening = new URLSearchParams(window.location.search).has('play') ? 'game' : 'menu';
    this.scenes.goto(opening, this.app.screen.width, this.app.screen.height);

    this.app.renderer.on('resize', (width, height) => {
      this.scenes.resize(width, height);
    });

    this.app.ticker.add((ticker) => {
      const deltaMs = Math.min(ticker.deltaMS, 1000 / 30);
      this.scenes.update(deltaMs, this.app.screen.width, this.app.screen.height);
      this.input.endFrame();
    });

    const debug = window as Window & {
      __skyline?: () => unknown;
      __skylineAdvance?: (deltaMs: number) => unknown;
      __skylineClick?: (x: number, y: number) => unknown;
    };
    debug.__skyline = () => this.scenes.debugState();
    debug.__skylineAdvance = (deltaMs: number) => {
      this.scenes.update(deltaMs, this.app.screen.width, this.app.screen.height);
      this.input.endFrame();
      this.app.render();
      return this.scenes.debugState();
    };
    debug.__skylineClick = (x: number, y: number) => {
      this.input.markClick(x, y);
      this.scenes.update(16, this.app.screen.width, this.app.screen.height);
      this.input.endFrame();
      this.app.render();
      return this.scenes.debugState();
    };
  }

  destroy(): void {
    this.input.detach(window);
    this.scenes.destroy();
    this.app.destroy(true);
  }
}
