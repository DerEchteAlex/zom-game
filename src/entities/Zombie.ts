import Phaser from "phaser";

export interface ZombieConfig {
  hp: number;
  speed: number; // px/sec
  scoreValue: number;
  moneyValue: number;
  color: number;
  label: string;
}

export class Zombie {
  sprite: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  maxHp: number;
  hp: number;
  speed: number;
  scoreValue: number;
  moneyValue: number;
  alive = true;

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: ZombieConfig) {
    this.maxHp = cfg.hp;
    this.hp = cfg.hp;
    this.speed = cfg.speed;
    this.scoreValue = cfg.scoreValue;
    this.moneyValue = cfg.moneyValue;

    this.body = scene.add.rectangle(0, 0, 40, 60, cfg.color).setStrokeStyle(2, 0x000000);
    this.hpBarBg = scene.add.rectangle(0, -45, 44, 6, 0x333333);
    this.hpBar = scene.add.rectangle(0, -45, 44, 6, 0xff5252);

    this.sprite = scene.add.container(x, y, [this.body, this.hpBarBg, this.hpBar]);
    this.sprite.setSize(40, 60);
    this.body.setInteractive({ useHandCursor: true });
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width = 44 * pct;
    this.hpBar.x = -22 + (44 * pct) / 2;
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
    }
  }

  update(dt: number) {
    if (!this.alive) return;
    // Walk left toward the base line (targetX)
    this.sprite.x -= this.speed * (dt / 1000);
  }

  hasReachedBase(targetX: number): boolean {
    return this.sprite.x <= targetX;
  }

  destroy() {
    this.sprite.destroy();
  }
}
