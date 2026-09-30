export type ScoreKind = 'ballistic' | 'cruise' | 'drone' | 'bomber' | 'bomb';

export const SCORE_TABLE: { kind: ScoreKind; label: string; points: number }[] = [
  { kind: 'ballistic', label: 'BALLISTIC', points: 500 },
  { kind: 'cruise', label: 'CRUISE', points: 350 },
  { kind: 'bomber', label: 'BOMBER', points: 250 },
  { kind: 'drone', label: 'DRONE', points: 200 },
  { kind: 'bomb', label: 'BOMB', points: 150 },
];

export const CITY_DAMAGE: Record<ScoreKind, number> = {
  ballistic: 25,
  cruise: 20,
  bomber: 0,
  drone: 15,
  bomb: 12,
};

export function scoreFor(kind: ScoreKind): number {
  return SCORE_TABLE.find((row) => row.kind === kind)?.points ?? 0;
}
