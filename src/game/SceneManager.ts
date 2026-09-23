import { Container } from 'pixi.js';

import type { Input } from './Input';
import type { Scene, SceneContext } from './scenes/Scene';

export class SceneManager {
  readonly root = new Container();

  private scenes = new Map<string, Scene>();
  private current: Scene | null = null;

  constructor(private input: Input) {}

  register(scene: Scene): void {
    this.scenes.set(scene.name, scene);
  }

  goto(name: string, width: number, height: number): void {
    const next = this.scenes.get(name);
    if (!next) {
      throw new Error(`Unknown scene: ${name}`);
    }

    if (this.current) {
      this.current.exit();
      this.root.removeChild(this.current.view);
    }

    this.current = next;
    this.root.addChild(next.view);
    this.input.endFrame();
    next.enter(this.context(width, height));
    next.resize(width, height);
  }

  update(deltaMs: number, width: number, height: number): void {
    this.current?.update(deltaMs, this.context(width, height));
  }

  resize(width: number, height: number): void {
    this.current?.resize(width, height);
  }

  destroy(): void {
    for (const scene of this.scenes.values()) {
      scene.destroy();
    }
    this.scenes.clear();
    this.current = null;
    this.root.destroy({ children: true });
  }

  private context(width: number, height: number): SceneContext {
    return {
      width,
      height,
      input: this.input,
      goto: (name) => this.goto(name, width, height),
    };
  }
}
