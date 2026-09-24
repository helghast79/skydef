import { Container, Graphics, Sprite, Text } from 'pixi.js';

import type { WeaponId } from '../defense/weapons';
import { WEAPON_IDS, WEAPONS } from '../defense/weapons';
import { iconTexture } from '../icons';
import { theme } from '../theme';

type Slot = { id: WeaponId; x: number; y: number; width: number; height: number };

const HUD_FONT = '"Courier New", monospace';

export class InfoBar {
  readonly view = new Container();
  private readonly panel = new Graphics();
  private readonly slotsGfx = new Graphics();
  private readonly hits = new Text({
    text: '',
    style: {
      fontFamily: HUD_FONT,
      fontSize: 12,
      fill: 0xd6e2ea,
    },
  });
  private readonly icons: Record<WeaponId, Sprite> = {
    long: new Sprite(),
    short: new Sprite(),
    drone: new Sprite(),
  };
  private readonly ammoText: Record<WeaponId, Text> = {
    long: this.makeAmmoText(),
    short: this.makeAmmoText(),
    drone: this.makeAmmoText(),
  };
  private slots: Slot[] = [];
  private bar = { x: 0, y: 0, width: 0, height: 0 };
  private iconsReady = false;

  constructor() {
    this.view.addChild(this.panel, this.slotsGfx, this.hits);
    for (const id of WEAPON_IDS) {
      this.icons[id].anchor.set(0.5, 0.5);
      this.view.addChild(this.icons[id], this.ammoText[id]);
    }
  }

  bindIcons(): void {
    for (const id of WEAPON_IDS) {
      this.icons[id].texture = iconTexture(id);
      this.icons[id].width = 28;
      this.icons[id].height = 28;
    }
    this.iconsReady = true;
  }

  resize(width: number, height: number): void {
    const barHeight = theme.layout.infoBarHeight;
    const y = height - barHeight;
    this.bar = { x: 0, y, width, height: barHeight };
    this.view.position.set(0, y);

    this.panel.clear();
    this.panel.rect(0, 0, width, barHeight).fill({ color: theme.colors.hudBg });
    this.panel.rect(0, 0, width, 2).fill({ color: theme.colors.hudLine });

    this.hits.anchor.set(1, 0.5);
    this.hits.position.set(width - 16, barHeight / 2);

    const slotCount = WEAPON_IDS.length;
    const pad = 16;
    const gap = 10;
    const slotW = 88;
    const slotH = 52;
    const rowWidth = slotCount * slotW + (slotCount - 1) * gap;
    const startX = Math.max(pad, (width - rowWidth) / 2 - 40);
    const slotY = (barHeight - slotH) / 2;

    this.slots = WEAPON_IDS.map((id, index) => ({
      id,
      x: startX + index * (slotW + gap),
      y: slotY,
      width: slotW,
      height: slotH,
    }));
  }

  contains(x: number, y: number): boolean {
    return x >= this.bar.x && x <= this.bar.x + this.bar.width && y >= this.bar.y && y <= this.bar.y + this.bar.height;
  }

  hitWeapon(x: number, y: number): WeaponId | null {
    const localX = x - this.bar.x;
    const localY = y - this.bar.y;
    const slot = this.slots.find(
      (item) =>
        localX >= item.x && localX <= item.x + item.width && localY >= item.y && localY <= item.y + item.height,
    );
    return slot?.id ?? null;
  }

  setState(state: {
    selected: WeaponId;
    ammo: Record<WeaponId, number>;
    downed: number;
    hits: number;
  }): void {
    this.hits.text = `${state.downed}  ·  ${state.hits}  ·  ESC`;

    this.slotsGfx.clear();
    for (const slot of this.slots) {
      const active = slot.id === state.selected;
      const def = WEAPONS[slot.id];
      this.slotsGfx.roundRect(slot.x, slot.y, slot.width, slot.height, 6).fill({
        color: active ? 0x1b2618 : 0x12181e,
      });
      this.slotsGfx.roundRect(slot.x, slot.y, slot.width, slot.height, 6).stroke({
        width: active ? 2 : 1,
        color: active ? def.color : 0x2c3a44,
      });

      const icon = this.icons[slot.id];
      icon.visible = this.iconsReady;
      icon.position.set(slot.x + 24, slot.y + slot.height / 2);
      icon.alpha = active ? 1 : 0.7;

      const ammo = this.ammoText[slot.id];
      ammo.text = `${state.ammo[slot.id]}`;
      ammo.style.fill = active ? def.color : 0xa8b4bc;
      ammo.anchor.set(0.5, 0.5);
      ammo.position.set(slot.x + slot.width - 22, slot.y + slot.height / 2);
    }
  }

  private makeAmmoText(): Text {
    return new Text({
      text: '0',
      style: {
        fontFamily: HUD_FONT,
        fontSize: 18,
        fill: 0xa8b4bc,
      },
    });
  }
}
