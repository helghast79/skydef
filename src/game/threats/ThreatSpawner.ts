import type { ThreatKind } from './Threat';
import { Threat } from './Threat';

const KINDS: ThreatKind[] = ['bomb', 'drone', 'ballistic', 'cruise'];

export class ThreatSpawner {
  private cooldown = 900;

  reset(): void {
    this.cooldown = 900;
  }

  update(
    deltaMs: number,
    bounds: { width: number; left: number; right: number; rooftop: number },
  ): Threat | null {
    this.cooldown -= deltaMs;
    if (this.cooldown > 0) {
      return null;
    }

    this.cooldown = 1100 + Math.random() * 900;
    const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
    const targetX = bounds.left + Math.random() * (bounds.right - bounds.left);
    const fromLeft = Math.random() > 0.5;

    if (kind === 'cruise') {
      const x = fromLeft ? -30 : bounds.width + 30;
      return new Threat(kind, x, bounds.rooftop - 80 - Math.random() * 70, targetX, bounds.rooftop);
    }

    if (kind === 'drone') {
      const x = fromLeft ? -20 : bounds.width + 20;
      return new Threat(kind, x, 40 + Math.random() * 80, targetX, bounds.rooftop);
    }

    const x = 40 + Math.random() * (bounds.width - 80);
    return new Threat(kind, x, -20, targetX, bounds.rooftop);
  }
}
