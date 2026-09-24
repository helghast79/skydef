export const WEAPON_IDS = ['long', 'short', 'drone'] as const;

export type WeaponId = (typeof WEAPON_IDS)[number];

export type WeaponDef = {
  id: WeaponId;
  label: string;
  color: number;
  speed: number;
  blastRadius: number;
  startAmmo: number;
  maxAmmo: number;
  regenMs: number;
  regenAmount: number;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  long: {
    id: 'long',
    label: 'LONG',
    color: 0x7ec8ff,
    speed: 520,
    blastRadius: 36,
    startAmmo: 3,
    maxAmmo: 6,
    regenMs: 5600,
    regenAmount: 1,
  },
  short: {
    id: 'short',
    label: 'SHORT',
    color: 0xff8a4a,
    speed: 680,
    blastRadius: 22,
    startAmmo: 5,
    maxAmmo: 10,
    regenMs: 3800,
    regenAmount: 1,
  },
  drone: {
    id: 'drone',
    label: 'DRONE',
    color: 0x7dff9a,
    speed: 400,
    blastRadius: 18,
    startAmmo: 3,
    maxAmmo: 6,
    regenMs: 6200,
    regenAmount: 1,
  },
};
