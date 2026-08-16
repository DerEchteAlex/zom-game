import Phaser from "phaser";

export interface ZombieConfig {
  hp: number;
  speed: number; // px/sec
  scoreValue: number;
  moneyValue: number;
  color: number;
  label: string;
  animKey: string; // Phaser animation key to play (created in GameScene.create())
  textureKey: string; // texture key prefix for the first frame, e.g. "zombie-normal" -> "zombie-normal-1"
  width: number; // display width in px — lets each zombie type have its own size
  height: number; // display height in px
}

export class Zombie {
  sprite: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarWidth: number;
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

    this.body = scene.add.sprite(0, 0, `${cfg.textureKey}-1`).setDisplaySize(cfg.width, cfg.height);
    this.body.play(cfg.animKey);

    // HP bar scales with zombie size instead of being hardcoded to one size for all types.
    this.hpBarWidth = cfg.width + 4;
    const barY = -(cfg.height / 2) - 10;
    this.hpBarBg = scene.add.rectangle(0, barY, this.hpBarWidth, 6, 0x333333);
    this.hpBar = scene.add.rectangle(0, barY, this.hpBarWidth, 6, 0xff5252);

    this.sprite = scene.add.container(x, y, [this.body, this.hpBarBg, this.hpBar]);
    this.sprite.setSize(cfg.width, cfg.height);
    this.body.setInteractive({ useHandCursor: true });
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width = this.hpBarWidth * pct;
    this.hpBar.x = -this.hpBarWidth / 2 + (this.hpBarWidth * pct) / 2;
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
