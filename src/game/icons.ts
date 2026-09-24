import { Assets, Texture } from 'pixi.js';

import type { WeaponId } from './defense/weapons';
import { WEAPON_IDS } from './defense/weapons';
import droneUrl from '../assets/icons/weapon-drone.svg?url';
import longUrl from '../assets/icons/weapon-long.svg?url';
import shortUrl from '../assets/icons/weapon-short.svg?url';

const ICON_URLS: Record<WeaponId, string> = {
  long: longUrl,
  short: shortUrl,
  drone: droneUrl,
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
