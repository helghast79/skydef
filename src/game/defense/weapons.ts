export const WEAPON_IDS = ['artillery', 'missile', 'flak'] as const;

export type WeaponId = (typeof WEAPON_IDS)[number];

export type WeaponDef = {
  id: WeaponId;
  label: string;
  color: number;
  meter: 'heat' | 'ammo';
  startOwned: boolean;
  startAmmo: number;
  maxAmmo: number;
  fireCooldownMs: number;
  projectileSpeed: number;
  hitRadius: number;
  killChanceMin: number;
  killChanceMax: number;
  heatPerShot: number;
  droppable: boolean;
  dropAmmo: number;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  artillery: {
    id: 'artillery',
    label: 'GUN',
    color: 0xffc14a,
    meter: 'heat',
    startOwned: true,
    startAmmo: 0,
    maxAmmo: 0,
    fireCooldownMs: 70,
    projectileSpeed: 980,
    hitRadius: 14,
    killChanceMin: 0.18,
    killChanceMax: 0.72,
    heatPerShot: 5.5,
    droppable: false,
    dropAmmo: 0,
  },
  missile: {
    id: 'missile',
    label: 'MISSILE',
    color: 0xff8a3a,
    meter: 'ammo',
    startOwned: false,
    startAmmo: 0,
    maxAmmo: 8,
    fireCooldownMs: 420,
    projectileSpeed: 520,
    hitRadius: 26,
    killChanceMin: 1,
    killChanceMax: 1,
    heatPerShot: 0,
    droppable: true,
    dropAmmo: 3,
  },
  flak: {
    id: 'flak',
    label: 'FLAK',
    color: 0x4aa8ff,
    meter: 'ammo',
    startOwned: false,
    startAmmo: 0,
    maxAmmo: 16,
    fireCooldownMs: 160,
    projectileSpeed: 760,
    hitRadius: 20,
    killChanceMin: 0.4,
    killChanceMax: 0.95,
    heatPerShot: 0,
    droppable: true,
    dropAmmo: 6,
  },
};

export const DROPPABLE_WEAPONS = WEAPON_IDS.filter((id) => WEAPONS[id].droppable);
