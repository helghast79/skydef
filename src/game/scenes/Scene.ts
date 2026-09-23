import { Container } from 'pixi.js';

import type { Input } from '../Input';

export interface SceneContext {
  width: number;
  height: number;
  input: Input;
  goto: (name: string) => void;
}

export interface Scene {
  readonly name: string;
  readonly view: Container;
  enter(context: SceneContext): void;
  exit(): void;
  update(deltaMs: number, context: SceneContext): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
