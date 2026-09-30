export const WEAPON_IDS = ['missile'] as const;

export type WeaponId = (typeof WEAPON_IDS)[number];

export type WeaponDef = {
  id: WeaponId;
  label: string;
  color: number;
  startAmmo: number;
  maxAmmo: number;
  regenMs: number;
  regenAmount: number;
  duration: number;
  radius: number;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  missile: {
    id: 'missile',
    label: 'MISSILE',
    color: 0xff8a3a,
    startAmmo: 10,
    maxAmmo: 14,
    regenMs: 2200,
    regenAmount: 1,
    duration: 1.05,
    radius: 108,
  },
};
