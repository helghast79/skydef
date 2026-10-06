import { Assets, Texture } from 'pixi.js';

import type { WeaponId } from './defense/weapons';
import { WEAPON_IDS } from './defense/weapons';
import artilleryUrl from '../assets/icons/weapon-artillery.svg?url';
import flakUrl from '../assets/icons/weapon-flak.svg?url';
import missileUrl from '../assets/icons/weapon-missile.svg?url';

const ICON_URLS: Record<WeaponId, string> = {
  artillery: artilleryUrl,
  missile: missileUrl,
  flak: flakUrl,
};

const textures = {} as Record<WeaponId, Texture>;

export async function loadIcons(): Promise<void> {
  await Promise.all(
    WEAPON_IDS.map(async (id) => {
      textures[id] = await Assets.load<Texture>(ICON_URLS[id]);
    }),
  );
}

export function iconTexture(id: WeaponId): Texture {
  return textures[id];
}
