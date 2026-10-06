import { Container, Graphics, Sprite, Text } from 'pixi.js';

import type { WeaponId } from '../defense/weapons';
import { WEAPONS } from '../defense/weapons';
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
  private readonly meterGfx = new Graphics();
  private readonly scoreText = new Text({
    text: '',
    style: { fontFamily: HUD_FONT, fontSize: 14, fill: 0xffe08a },
  });
  private readonly healthText = new Text({
    text: '',
    style: { fontFamily: HUD_FONT, fontSize: 12, fill: 0xd6e2ea },
  });
  private readonly pointsText = new Text({
    text: '',
    style: { fontFamily: HUD_FONT, fontSize: 10, fill: 0x8a9aaa },
  });
  private readonly meterText = new Text({
    text: '',
    style: { fontFamily: HUD_FONT, fontSize: 11, fill: 0xd6e2ea },
  });
  private readonly icons = new Map<WeaponId, Sprite>();
  private slots: Slot[] = [];
  private bar = { x: 0, y: 0, width: 0, height: 0 };
  private iconsReady = false;
  private lastHud = '';

  constructor() {
    this.view.addChild(
      this.panel,
      this.slotsGfx,
      this.healthGfx,
      this.meterGfx,
      this.scoreText,
      this.healthText,
      this.pointsText,
      this.meterText,
    );
    this.pointsText.text = SCORE_TABLE.map((row) => `${row.label} ${row.points}`).join('   ');
  }

  bindIcons(): void {
    for (const sprite of this.icons.values()) {
      sprite.destroy();
    }
    this.icons.clear();
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
    this.meterText.anchor.set(0.5, 0.5);
  }

  contains(x: number, y: number): boolean {
    return (
      x >= this.bar.x &&
      x <= this.bar.x + this.bar.width &&
      y >= this.bar.y &&
      y <= this.bar.y + this.bar.height
    );
  }

  hitWeapon(x: number, y: number): WeaponId | null {
    const localX = x - this.bar.x;
    const localY = y - this.bar.y;
    const slot = this.slots.find(
      (item) =>
        localX >= item.x &&
        localX <= item.x + item.width &&
        localY >= item.y &&
        localY <= item.y + item.height,
    );
    return slot?.id ?? null;
  }

  setState(state: {
    selected: WeaponId;
    owned: WeaponId[];
    ammo: Record<WeaponId, number>;
    heat: number;
    overheated: boolean;
    score: number;
    health: number;
  }): void {
    const ownedKey = state.owned.join(',');
    const ammoKey = state.owned.map((id) => `${id}:${state.ammo[id]}`).join('|');
    const signature = `${state.selected}:${ownedKey}:${ammoKey}:${state.heat.toFixed(0)}:${state.overheated}:${state.score}:${state.health}:${this.iconsReady}`;
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

    const slotW = 56;
    const slotH = 40;
    const gap = 8;
    const totalW = state.owned.length * slotW + Math.max(0, state.owned.length - 1) * gap;
    const startX = this.bar.width / 2 - totalW / 2;
    const slotY = 8;

    this.slots = state.owned.map((id, index) => ({
      id,
      x: startX + index * (slotW + gap),
      y: slotY,
      width: slotW,
      height: slotH,
    }));

    this.slotsGfx.clear();
    const seen = new Set<WeaponId>();
    for (const slot of this.slots) {
      seen.add(slot.id);
      const active = slot.id === state.selected;
      const def = WEAPONS[slot.id];
      this.slotsGfx.roundRect(slot.x, slot.y, slot.width, slot.height, 6).fill({
        color: active ? 0x1b2618 : 0x12181e,
      });
      this.slotsGfx.roundRect(slot.x, slot.y, slot.width, slot.height, 6).stroke({
        width: active ? 2 : 1,
        color: active ? def.color : 0x2c3a44,
      });

      let icon = this.icons.get(slot.id);
      if (!icon) {
        icon = new Sprite(iconTexture(slot.id));
        icon.anchor.set(0.5);
        icon.width = 26;
        icon.height = 26;
        this.icons.set(slot.id, icon);
        this.view.addChild(icon);
      }
      icon.visible = true;
      icon.texture = iconTexture(slot.id);
      icon.position.set(slot.x + slot.width / 2, slot.y + slot.height / 2);
      icon.alpha = active ? 1 : 0.65;
    }

    for (const [id, icon] of this.icons) {
      if (!seen.has(id)) {
        icon.visible = false;
      }
    }

    this.meterGfx.clear();
    const meterW = 160;
    const meterH = 10;
    const meterX = this.bar.width / 2 - meterW / 2;
    const meterY = 56;
    this.meterText.position.set(this.bar.width / 2, meterY + 18);

    const active = WEAPONS[state.selected];
    this.meterGfx.roundRect(meterX, meterY, meterW, meterH, 3).fill({ color: 0x1a2228 });

    if (active.meter === 'heat') {
      const heatFill = Math.max(0, Math.min(1, state.heat / 100));
      this.meterGfx.roundRect(meterX, meterY, meterW * heatFill, meterH, 3).fill({
        color: state.overheated ? 0xff4a3a : state.heat > 70 ? 0xff8a3a : 0xffc14a,
      });
      this.meterText.text = state.overheated
        ? 'OVERHEAT'
        : `HEAT  ${Math.round(state.heat)}%`;
      this.meterText.style.fill = state.overheated ? 0xff4a3a : 0xffc14a;
    } else {
      const ammoFill = active.maxAmmo > 0 ? state.ammo[state.selected] / active.maxAmmo : 0;
      this.meterGfx.roundRect(meterX, meterY, meterW * ammoFill, meterH, 3).fill({
        color: active.color,
      });
      this.meterText.text = `AMMO  ${state.ammo[state.selected]}`;
      this.meterText.style.fill = active.color;
    }
  }
}
