export class Input {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();

  pointer = { x: 0, y: 0, down: false, clicked: false };

  attach(target: Window): void {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  detach(target: Window): void {
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
  }

  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  wasPressed(...codes: string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }

  setPointer(x: number, y: number, down: boolean): void {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.down = down;
  }

  markClick(x: number, y: number): void {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.clicked = true;
  }

  endFrame(): void {
    this.pressed.clear();
    this.pointer.clicked = false;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    for (const token of this.tokens(event)) {
      this.held.add(token);
      this.pressed.add(token);
    }

    if (['Space', 'ArrowUp', 'ArrowDown', 'Enter'].includes(event.code) || event.key === ' ') {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    for (const token of this.tokens(event)) {
      this.held.delete(token);
    }
  };

  private tokens(event: KeyboardEvent): string[] {
    const tokens = [event.code, event.key];
    if (event.key === ' ') {
      tokens.push('Space');
    }
    return tokens.filter(Boolean);
  }
}
