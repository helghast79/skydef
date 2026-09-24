import { Threat } from './Threat';

export class ThreatSpawner {
  private ballisticIn = 0;
  private cruiseIn = 400;
  private droneIn = 800;

  reset(): void {
    this.ballisticIn = 0;
    this.cruiseIn = 400;
    this.droneIn = 800;
  }

  update(
    deltaMs: number,
    bounds: { width: number; height: number; left: number; right: number; rooftop: number },
  ): Threat[] {
    this.ballisticIn -= deltaMs;
    this.cruiseIn -= deltaMs;
    this.droneIn -= deltaMs;

    const spawned: Threat[] = [];

    if (this.ballisticIn <= 0) {
      this.ballisticIn = 8000 + Math.random() * 4000;
      spawned.push(this.spawnBallistic(bounds));
    }

    if (this.cruiseIn <= 0) {
      this.cruiseIn = 4800 + Math.random() * 2800;
      spawned.push(this.spawnCruise(bounds));
    }

    if (this.droneIn <= 0) {
      this.droneIn = 5200 + Math.random() * 2800;
      spawned.push(this.spawnDrone(bounds));
    }

    return spawned;
  }

  private spawnBallistic(bounds: { left: number; right: number; rooftop: number }): Threat {
    const targetX = bounds.left + Math.random() * (bounds.right - bounds.left);
    return new Threat({
      kind: 'ballistic',
      phase: 'alert',
      startX: targetX,
      startY: 58,
      targetX,
      targetY: bounds.rooftop,
      warnMs: 3000,
      durationMs: 9800,
      hitPoints: 3,
    });
  }

  private spawnCruise(bounds: {
    width: number;
    height: number;
    left: number;
    right: number;
    rooftop: number;
  }): Threat {
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -28 : bounds.width + 28;
    const startY = bounds.height * (0.12 + Math.random() * 0.38);
    const targetX = bounds.left + Math.random() * (bounds.right - bounds.left);
    const controlX = bounds.width * (fromLeft ? 0.38 : 0.62);
    const controlY = Math.min(startY, bounds.height * 0.18) - 30;

    return new Threat({
      kind: 'cruise',
      startX,
      startY,
      targetX,
      targetY: bounds.rooftop,
      controlX,
      controlY,
      durationMs: 16000 + Math.random() * 2400,
    });
  }

  private spawnDrone(bounds: {
    width: number;
    height: number;
    left: number;
    right: number;
    rooftop: number;
  }): Threat {
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -24 : bounds.width + 24;
    const midDown = bounds.height * (0.48 + Math.random() * 0.18);
    const startY = Math.min(midDown, bounds.rooftop - 50);
    const targetX = bounds.left + Math.random() * (bounds.right - bounds.left);

    return new Threat({
      kind: 'drone',
      startX,
      startY,
      targetX,
      targetY: bounds.rooftop,
    });
  }
}
