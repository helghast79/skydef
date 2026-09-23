import { Container, Graphics, Text } from 'pixi.js';

import type { WeaponId } from '../defense/weapons';
import { WEAPON_IDS, WEAPONS } from '../defense/weapons';
import { theme } from '../theme';

type Slot = { id: WeaponId; x: number; y: number; width: number; height: number };

const HUD_FONT = '"Courier New", monospace';

export class InfoBar {
  readonly view = new Container();
  private readonly panel = new Graphics();
  private readonly slotsGfx = new Graphics();
  private readonly status = new Text({
    text: '',
    style: {
      fontFamily: HUD_FONT,
      fontSize: 13,
      fill: theme.colors.menuActive,
    },
  });
  private readonly hits = new Text({
    text: '',
    style: {
      fontFamily: HUD_FONT,
      fontSize: 13,
      fill: 0xd6e2ea,
    },
  });
  private readonly slotLabels: Record<WeaponId, Text>;
  private slots: Slot[] = [];
  private bar = { x: 0, y: 0, width: 0, height: 0 };

  constructor() {
    this.slotLabels = {
      upper: this.makeSlotText(),
      mid: this.makeSlotText(),
      short: this.makeSlotText(),
      drone: this.makeSlotText(),
    };
    this.view.addChild(this.panel, this.slotsGfx, this.status, this.hits);
    for (const id of WEAPON_IDS) {
      this.view.addChild(this.slotLabels[id]);
    }
  }

  resize(width: number, height: number): void {
    const barHeight = theme.layout.infoBarHeight;
    const y = height - barHeight;
    this.bar = { x: 0, y, width, height: barHeight };
    this.view.position.set(0, y);

    this.panel.clear();
    this.panel.rect(0, 0, width, barHeight).fill({ color: theme.colors.hudBg });
    this.panel.rect(0, 0, width, 2).fill({ color: theme.colors.hudLine });

    this.status.anchor.set(0, 0.5);
    this.status.position.set(16, 14);

    this.hits.anchor.set(1, 0.5);
    this.hits.position.set(width - 16, 14);

    const pad = 12;
    const slotY = 28;
    const slotH = 60;
    const gap = 8;
    const slotW = (width - pad * 2 - gap * 3) / 4;
    this.slots = WEAPON_IDS.map((id, index) => ({
      id,
      x: pad + index * (slotW + gap),
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
    status: string;
  }): void {
    this.status.text = state.status;
    this.hits.text = `DOWNED ${state.downed}   CITY HITS ${state.hits}   ESC MENU`;

    this.slotsGfx.clear();
    for (const slot of this.slots) {
      const active = slot.id === state.selected;
      const def = WEAPONS[slot.id];
      this.slotsGfx.roundRect(slot.x, slot.y, slot.width, slot.height, 4).fill({
        color: active ? 0x1b2618 : 0x12181e,
      });
      this.slotsGfx.roundRect(slot.x, slot.y, slot.width, slot.height, 4).stroke({
        width: active ? 2 : 1,
        color: active ? def.color : 0x2c3a44,
      });

      const label = this.slotLabels[slot.id];
      label.text = `${def.label}   ${state.ammo[slot.id]}/${def.maxAmmo}\n${def.hint}`;
      label.style.fill = active ? def.color : 0xa8b4bc;
      label.anchor.set(0.5, 0.5);
      label.position.set(slot.x + slot.width / 2, slot.y + slot.height / 2);
    }
  }

  private makeSlotText(): Text {
    return new Text({
      text: '',
      style: {
        fontFamily: HUD_FONT,
        fontSize: 13,
        fill: 0xa8b4bc,
        align: 'center',
        lineHeight: 18,
      },
    });
  }
}
