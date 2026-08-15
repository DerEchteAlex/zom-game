import Phaser from "phaser";

export class Bullet {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  damage: number;
  alive = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number,
    damage: number
  ) {
    this.damage = damage;
    this.sprite = scene.add.circle(x, y, 5, 0xfff59d);

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  update(dt: number) {
    this.sprite.x += this.vx * (dt / 1000);
    this.sprite.y += this.vy * (dt / 1000);
  }

  isOffScreen(width: number, height: number): boolean {
    return this.sprite.x < 0 || this.sprite.x > width || this.sprite.y < 0 || this.sprite.y > height;
  }

  destroy() {
    this.sprite.destroy();
  }
}
