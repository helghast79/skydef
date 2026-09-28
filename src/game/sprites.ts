import { Assets, Texture } from 'pixi.js';

type MissileKind = 'ballistic' | 'cruise';
type MissileClip = 'flying' | 'explosion';

const CLIP_FILES: Record<MissileKind, Record<MissileClip, string>> = {
  ballistic: { flying: 'Missile_2_Flying', explosion: 'Missile_2_Explosion' },
  cruise: { flying: 'Missile_3_Flying', explosion: 'Missile_3_Explosion' },
};

const urls = import.meta.glob('../assets/sprites/missile/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(urls)) {
  const name = path.split('/').pop();
  if (name) {
    byName.set(name, url);
  }
}

const textures: Record<MissileKind, Record<MissileClip, Texture[]>> = {
  ballistic: { flying: [], explosion: [] },
  cruise: { flying: [], explosion: [] },
};

function frameUrls(prefix: string): string[] {
  return [...byName.entries()]
    .filter(([name]) => name.startsWith(`${prefix}_`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, url]) => url);
}

export async function loadMissileSprites(): Promise<void> {
  const kinds: MissileKind[] = ['ballistic', 'cruise'];
  const clips: MissileClip[] = ['flying', 'explosion'];

  await Promise.all(
    kinds.flatMap((kind) =>
      clips.map(async (clip) => {
        const files = frameUrls(CLIP_FILES[kind][clip]);
        if (files.length === 0) {
          throw new Error(`Missing missile frames for ${CLIP_FILES[kind][clip]}`);
        }
        textures[kind][clip] = await Promise.all(files.map((url) => Assets.load<Texture>(url)));
      }),
    ),
  );
}

export function missileTextures(kind: MissileKind, clip: MissileClip): Texture[] {
  return textures[kind][clip];
}
