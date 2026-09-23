export const WEAPON_IDS = ['upper', 'mid', 'short', 'drone'] as const;

export type WeaponId = (typeof WEAPON_IDS)[number];

export type WeaponDef = {
  id: WeaponId;
  label: string;
  hint: string;
  color: number;
  speed: number;
  blastRadius: number;
  startAmmo: number;
  maxAmmo: number;
  regenMs: number;
  regenAmount: number;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  upper: {
    id: 'upper',
    label: 'UPPER',
    hint: 'SPACE BALLISTIC',
    color: 0x7ec8ff,
    speed: 820,
    blastRadius: 38,
    startAmmo: 2,
    maxAmmo: 4,
    regenMs: 8000,
    regenAmount: 1,
  },
  mid: {
    id: 'mid',
    label: 'MID',
    hint: 'BALLISTIC / CRUISE',
    color: 0xffe08a,
    speed: 640,
    blastRadius: 30,
    startAmmo: 3,
    maxAmmo: 8,
    regenMs: 5200,
    regenAmount: 1,
  },
  short: {
    id: 'short',
    label: 'SHORT',
    hint: 'CLOSE-IN',
    color: 0xff8a4a,
    speed: 720,
    blastRadius: 22,
    startAmmo: 6,
    maxAmmo: 14,
    regenMs: 3600,
    regenAmount: 2,
  },
  drone: {
    id: 'drone',
    label: 'DRONE',
    hint: 'UAV INTERCEPT',
    color: 0x7dff9a,
    speed: 460,
    blastRadius: 20,
    startAmmo: 2,
    maxAmmo: 6,
    regenMs: 6400,
    regenAmount: 1,
  },
};
