import Phaser from "phaser";
import { nextUpgradeCost, type GunStats } from "../entities/Gun";

interface UpgradeDef {
  key: keyof GunStats;
  label: string;
  baseCost: number;
  step: number; // change applied per upgrade
  format: (v: number) => string;
}

const UPGRADES: UpgradeDef[] = [
  { key: "damage", label: "Damage", baseCost: 20, step: 3, format: (v) => `${v}` },
  { key: "fireRateMs", label: "Fire Rate (lower = faster)", baseCost: 25, step: -25, format: (v) => `${v}ms` },
  { key: "reloadMs", label: "Reload Speed (lower = faster)", baseCost: 20, step: -80, format: (v) => `${v}ms` },
  { key: "magazineSize", label: "Magazine Size", baseCost: 30, step: 2, format: (v) => `${v}` },
];

export class ShopScene extends Phaser.Scene {
  money = 0;
  stats!: GunStats;
  levels: Record<string, number> = { damage: 0, fireRateMs: 0, reloadMs: 0, magazineSize: 0 };
  moneyText!: Phaser.GameObjects.Text;
  rowTexts: Partial<Record<keyof GunStats, Phaser.GameObjects.Text>> = {};

  constructor() {
    super("ShopScene");
  }

  init() {
    this.money = this.registry.get("money") ?? 0;
    this.stats = this.registry.get("gunStats") ?? {
      damage: 10,
      fireRateMs: 400,
      reloadMs: 1200,
      magazineSize: 8,
    };
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1b1b1b);
    const round = this.registry.get("round") ?? 2;

    this.add
      .text(450, 40, `SHOP — Round ${round} starting soon`, {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);

    this.moneyText = this.add.text(450, 90, "", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#4fc3f7",
    }).setOrigin(0.5, 0);

    UPGRADES.forEach((u, i) => {
      const y = 160 + i * 90;
      this.add.rectangle(450, y, 700, 70, 0x2b2b2b).setStrokeStyle(2, 0x444444);
      const text = this.add.text(130, y, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
      }).setOrigin(0, 0.5);
      this.rowTexts[u.key] = text;

      const btn = this.add.rectangle(720, y, 120, 44, 0x4caf50).setInteractive({ useHandCursor: true });
      this.add
        .text(720, y, "UPGRADE", { fontFamily: "monospace", fontSize: "14px", color: "#000000" })
        .setOrigin(0.5);

      btn.on("pointerdown", () => this.buyUpgrade(u));
    });

    const nextBtn = this.add
      .rectangle(450, 160 + UPGRADES.length * 90 + 20, 260, 56, 0xff5252)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(450, 160 + UPGRADES.length * 90 + 20, "Start Next Round", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#000000",
      })
      .setOrigin(0.5);
    nextBtn.on("pointerdown", () => this.startNextRound());

    this.refreshTexts();
  }

  buyUpgrade(u: UpgradeDef) {
    const level = this.levels[u.key];
    const cost = nextUpgradeCost(level, u.baseCost);
    if (this.money < cost) return;

    this.money -= cost;
    this.levels[u.key] = level + 1;
    (this.stats[u.key] as number) += u.step;

    // Clamp sensible bounds
    if (u.key === "fireRateMs") this.stats.fireRateMs = Math.max(80, this.stats.fireRateMs);
    if (u.key === "reloadMs") this.stats.reloadMs = Math.max(300, this.stats.reloadMs);

    this.refreshTexts();
  }

  refreshTexts() {
    this.moneyText.setText(`Money: $${this.money}`);
    UPGRADES.forEach((u) => {
      const level = this.levels[u.key];
      const cost = nextUpgradeCost(level, u.baseCost);
      const text = this.rowTexts[u.key];
      if (text) {
        text.setText(`${u.label}: ${u.format(this.stats[u.key] as number)}  (Lv ${level})   Cost: $${cost}`);
      }
    });
  }

  startNextRound() {
    this.registry.set("gunStats", this.stats);
    this.registry.set("money", this.money);
    this.scene.start("GameScene");
  }
}
