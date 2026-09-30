import { Assets, Texture } from 'pixi.js';

type MissileKind = 'ballistic' | 'cruise';
type MissileClip = 'flying' | 'explosion';
type BombClip = 'idle' | 'explosion';

const MISSILE_FILES: Record<MissileKind, Record<MissileClip, string>> = {
  ballistic: { flying: 'Missile_2_Flying', explosion: 'Missile_2_Explosion' },
  cruise: { flying: 'Missile_3_Flying', explosion: 'Missile_3_Explosion' },
};

const BOMB_IDLE = 'Bomb_1_Idle';
const BOMB_EXPLOSION = 'Bomb_1_Explosion';

const missileUrls = import.meta.glob('../assets/sprites/missile/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const bombUrls = import.meta.glob('../assets/sprites/bombs/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const byName = new Map<string, string>();
for (const [path, url] of Object.entries({ ...missileUrls, ...bombUrls })) {
  const name = path.split('/').pop();
  if (name) {
    byName.set(name, url);
  }
}

const missileTexturesStore: Record<MissileKind, Record<MissileClip, Texture[]>> = {
  ballistic: { flying: [], explosion: [] },
  cruise: { flying: [], explosion: [] },
};

const bombTexturesStore: Record<BombClip, Texture[]> = {
  idle: [],
  explosion: [],
};

function frameUrls(prefix: string): string[] {
  return [...byName.entries()]
    .filter(([name]) => name.startsWith(`${prefix}_`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, url]) => url);
}

async function loadFrames(prefix: string): Promise<Texture[]> {
  const files = frameUrls(prefix);
  if (files.length === 0) {
    throw new Error(`Missing sprite frames for ${prefix}`);
  }
  return Promise.all(files.map((url) => Assets.load<Texture>(url)));
}

export async function loadMissileSprites(): Promise<void> {
  const kinds: MissileKind[] = ['ballistic', 'cruise'];
  const clips: MissileClip[] = ['flying', 'explosion'];

  await Promise.all([
    ...kinds.flatMap((kind) =>
      clips.map(async (clip) => {
        missileTexturesStore[kind][clip] = await loadFrames(MISSILE_FILES[kind][clip]);
      }),
    ),
    (async () => {
      bombTexturesStore.idle = await loadFrames(BOMB_IDLE);
      bombTexturesStore.explosion = await loadFrames(BOMB_EXPLOSION);
    })(),
  ]);
}

export function missileTextures(kind: MissileKind, clip: MissileClip): Texture[] {
  return missileTexturesStore[kind][clip];
}

export function bombTextures(clip: BombClip): Texture[] {
  return bombTexturesStore[clip];
}
