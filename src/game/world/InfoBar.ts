import { Container, Graphics, Sprite, Text } from 'pixi.js';

import type { WeaponId } from '../defense/weapons';
import { WEAPON_IDS, WEAPONS } from '../defense/weapons';
import { iconTexture } from '../icons';
import { SCORE_TABLE } from '../scoring';
import { theme } from '../theme';

type Slot = { id: WeaponId; x: number; y: number; width: number; height: number };

const HUD_FONT = '"Courier New", monospace';

export class InfoBar {
  readonly view = new Container();
  private readonly panel = new Graphics();
  private readonly slotsGfx = new Graphics();
  private readonly healthGfx = new Graphics();
  private readonly scoreText = new Text({
    text: '',
    style: {
      fontFamily: HUD_FONT,
      fontSize: 14,
      fill: 0xffe08a,
    },
  });
  private readonly healthText = new Text({
    text: '',
    style: {
      fontFamily: HUD_FONT,
      fontSize: 12,
      fill: 0xd6e2ea,
    },
  });
  private readonly pointsText = new Text({
    text: '',
    style: {
      fontFamily: HUD_FONT,
      fontSize: 10,
      fill: 0x8a9aaa,
    },
  });
  private readonly icons: Record<WeaponId, Sprite> = {
    missile: new Sprite(),
  };
  private readonly ammoText: Record<WeaponId, Text> = {
    missile: this.makeAmmoText(),
  };
  private slots: Slot[] = [];
  private bar = { x: 0, y: 0, width: 0, height: 0 };
  private iconsReady = false;
  private lastHud = '';

  constructor() {
    this.view.addChild(
      this.panel,
      this.slotsGfx,
      this.healthGfx,
      this.scoreText,
      this.healthText,
      this.pointsText,
    );
    for (const id of WEAPON_IDS) {
      this.icons[id].anchor.set(0.5, 0.5);
      this.view.addChild(this.icons[id], this.ammoText[id]);
    }
    this.pointsText.text = SCORE_TABLE.map((row) => `${row.label} ${row.points}`).join('   ');
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
    this.lastHud = '';
    const barHeight = theme.layout.infoBarHeight;
    const y = height - barHeight;
    this.bar = { x: 0, y, width, height: barHeight };
    this.view.position.set(0, y);

    this.panel.clear();
    this.panel.rect(0, 0, width, barHeight).fill({ color: theme.colors.hudBg });
    this.panel.rect(0, 0, width, 2).fill({ color: theme.colors.hudLine });

    this.scoreText.anchor.set(0, 0.5);
    this.scoreText.position.set(16, 18);

    this.healthText.anchor.set(0, 0.5);
    this.healthText.position.set(16, 42);

    this.pointsText.anchor.set(1, 0.5);
    this.pointsText.position.set(width - 16, 18);

    const slotW = 96;
    const slotH = 48;
    const startX = width / 2 - slotW / 2;
    const slotY = (barHeight - slotH) / 2 + 6;

    this.slots = WEAPON_IDS.map((id) => ({
      id,
      x: startX,
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
    score: number;
    health: number;
  }): void {
    const signature = `${state.selected}:${state.ammo.missile}:${state.score}:${state.health}:${this.iconsReady}`;
    if (signature === this.lastHud) {
      return;
    }
    this.lastHud = signature;

    this.scoreText.text = `SCORE  ${state.score}`;
    this.healthText.text = `CITY  ${Math.max(0, Math.round(state.health))}%`;

    this.healthGfx.clear();
    const barX = 90;
    const barY = 36;
    const barW = 140;
    const barH = 10;
    const fill = Math.max(0, Math.min(1, state.health / 100));
    this.healthGfx.roundRect(barX, barY, barW, barH, 3).fill({ color: 0x1a2228 });
    this.healthGfx.roundRect(barX, barY, barW * fill, barH, 3).fill({
      color: state.health > 40 ? 0x5ad67a : state.health > 20 ? 0xffc14a : 0xff4a3a,
    });

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
      icon.position.set(slot.x + 28, slot.y + slot.height / 2);
      icon.alpha = active ? 1 : 0.7;

      const ammo = this.ammoText[slot.id];
      ammo.text = `${state.ammo[slot.id]}`;
      ammo.style.fill = active ? def.color : 0xa8b4bc;
      ammo.anchor.set(0.5, 0.5);
      ammo.position.set(slot.x + slot.width - 24, slot.y + slot.height / 2);
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
