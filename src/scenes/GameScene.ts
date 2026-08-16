import Phaser from "phaser";
import { Gun, type GunStats } from "../entities/Gun";
import { Zombie } from "../entities/Zombie";
import { Bullet } from "../entities/Bullet";
import { getWaveConfig, getZombieConfig, pickZombieType } from "../systems/WaveManager";

const BASE_LINE_X = 80;
const SPAWN_X = 860;

type Phase = "active" | "cleared" | "gameover";

export class GameScene extends Phaser.Scene {
  gun!: Gun;
  zombies: Zombie[] = [];
  bullets: Bullet[] = [];
  round = 1;
  money = 0;
  lives = 3;
  phase: Phase = "active";

  readonly PLAYER_X = 40;
  readonly PLAYER_Y = 300;
  readonly BULLET_SPEED = 800; // px/sec — tune for feel

  spawnedThisWave = 0;
  waveTotal = 0;
  spawnTimer = 0;
  spawnIntervalMs = 1000;

  hudText!: Phaser.GameObjects.Text;
  reloadBarBg!: Phaser.GameObjects.Rectangle;
  reloadBar!: Phaser.GameObjects.Rectangle;
  baseLine!: Phaser.GameObjects.Rectangle;
  messageText!: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  init() {
    // Pull persisted state from registry (survives scene restarts from the shop)
    const persisted = this.registry.get("gunStats") as GunStats | undefined;
    const stats: GunStats = persisted ?? {
      damage: 10,
      fireRateMs: 400,
      reloadMs: 1200,
      magazineSize: 10,
    };
    this.gun = new Gun(stats);

    this.round = this.registry.get("round") ?? 1;
    this.money = this.registry.get("money") ?? 0;
    this.lives = this.registry.get("lives") ?? 5;
  }

  preload() {
    // Files must live in public/assets/ (not src/assets/) — Vite only serves public/ at the site root.
    this.load.image("zombie-normal-1", "assets/zom-normal-walk1.png");
    this.load.image("zombie-normal-2", "assets/zom-normal-walk2.png");
    this.load.image("zombie-fast-1", "assets/zom-fast-walk1.png");
    this.load.image("zombie-fast-2", "assets/zom-fast-walk2.png");
    this.load.image("zombie-tank-1", "assets/zom-fat-walk1.png");
    this.load.image("zombie-tank-2", "assets/zom-fat-walk2.png");
    this.load.image("player", "assets/player.png");
    this.load.image("background", "assets/background.png");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x2b2b2b);
    this.add.image(450, 300, "background").setDisplaySize(900, 600);

    // Register walk animations once per scene start — must happen before any zombie spawns.
    // Guarded because create() re-runs every time we return from the shop, and Phaser's
    // animation manager is global (not per-scene-instance), so re-creating the same key throws.
    if (!this.anims.exists("walk-normal")) {
      this.anims.create({
        key: "walk-normal",
        frames: [{ key: "zombie-normal-1" }, { key: "zombie-normal-2" }],
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!this.anims.exists("walk-fast")) {
      this.anims.create({
        key: "walk-fast",
        frames: [{ key: "zombie-fast-1" }, { key: "zombie-fast-2" }],
        frameRate: 8, // faster flicker to match faster movement
        repeat: -1,
      });
    }
    if (!this.anims.exists("walk-tank")) {
      this.anims.create({
        key: "walk-tank",
        frames: [{ key: "zombie-tank-1" }, { key: "zombie-tank-2" }],
        frameRate: 2, // slower, heavier feel
        repeat: -1,
      });
    }
    
    // Player firing origin
    this.add.image(this.PLAYER_X, this.PLAYER_Y, "player").setDisplaySize(60, 60);

    this.hudText = this.add.text(20, 20, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff",
    });

    this.input.keyboard?.on("keydown-R", () => {
      this.tryManualReload();
    });

    this.reloadBarBg = this.add.rectangle(450, 580, 200, 14, 0x333333);
    this.reloadBar = this.add.rectangle(450, 580, 200, 14, 0x4fc3f7);

    this.messageText = this.add
      .text(450, 300, "", { fontFamily: "monospace", fontSize: "32px", color: "#ffffff" })
      .setOrigin(0.5);

    const wave = getWaveConfig(this.round);
    this.waveTotal = wave.zombieCount;
    this.spawnIntervalMs = wave.spawnIntervalMs;
    this.spawnedThisWave = 0;
    this.spawnTimer = 0;
    this.zombies = [];
    this.bullets = [];
    this.phase = "active";

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.tryShoot(pointer.x, pointer.y);
    });
  }

  spawnZombie() {
    const type = pickZombieType();
    const cfg = getZombieConfig(this.round, type);
    const y = Phaser.Math.Between(100, 500);
    const z = new Zombie(this, SPAWN_X, y, cfg);
    this.zombies.push(z);
    this.spawnedThisWave++;
  }

  tryShoot(x: number, y: number) {
    if (this.phase !== "active") return;
    const now = this.time.now;
    if (!this.gun.canShoot(now)) return;

    this.gun.shoot(now);
    const bullet = new Bullet(this, this.PLAYER_X, this.PLAYER_Y, x, y, this.BULLET_SPEED, this.gun.stats.damage);
    this.bullets.push(bullet);
  }

  tryManualReload() {
    if (this.phase !== "active") return;
    if (this.gun.reloading) return;
    if (this.gun.ammoInMag >= this.gun.stats.magazineSize) return; // already full
    this.gun.startReload(this.time.now);
  }

  update(_time: number, delta: number) {
    if (this.phase === "gameover") return;

    this.gun.update(this.time.now);

    // Reload bar
    const rp = this.gun.reloadProgress(this.time.now);
    this.reloadBar.width = 200 * rp;

    if (this.phase !== "active") {
      this.updateHud();
      return;
    }

    // Spawning
    this.spawnTimer += delta;
    if (this.spawnedThisWave < this.waveTotal && this.spawnTimer >= this.spawnIntervalMs) {
      this.spawnTimer = 0;
      this.spawnZombie();
    }

    // Update zombies
    for (const z of this.zombies) {
      if (!z.alive) continue;
      z.update(delta);
      if (z.hasReachedBase(BASE_LINE_X)) {
        z.alive = false;
        this.lives -= 1;
        z.destroy();
      }
    }

    // Clean up dead zombies (with a tiny delay could add death animation later)
    this.zombies = this.zombies.filter((z) => {
      if (!z.alive) {
        z.destroy();
        return false;
      }
      return true;
    });

    // Update bullets and check collisions
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.update(delta);

      for (const z of this.zombies) {
        if (!z.alive) continue;
        // Use displayWidth/displayHeight, not width/height — sprites keep
        // their original texture size in width/height even after setDisplaySize().
        const left = z.sprite.x - z.body.displayWidth / 2;
        const right = z.sprite.x + z.body.displayWidth / 2;
        const top = z.sprite.y - z.body.displayHeight / 2;
        const bottom = z.sprite.y + z.body.displayHeight / 2;
        if (b.sprite.x >= left && b.sprite.x <= right && b.sprite.y >= top && b.sprite.y <= bottom) {
          z.takeDamage(b.damage);
          if (!z.alive) this.money += z.moneyValue;
          b.alive = false;
          break;
        }
      }

      if (b.isOffScreen(900, 600)) b.alive = false;
    }
    this.bullets = this.bullets.filter((b) => {
      if (!b.alive) {
        b.destroy();
        return false;
      }
      return true;
    });

    if (this.lives <= 0) {
      this.phase = "gameover";
      this.messageText.setText("GAME OVER\nClick to restart");
      this.input.once("pointerdown", () => this.restart());
    } else if (this.spawnedThisWave >= this.waveTotal && this.zombies.length === 0) {
      this.phase = "cleared";
      this.messageText.setText(`Round ${this.round} cleared!\nClick to open shop`);
      this.input.once("pointerdown", () => this.goToShop());
    }

    this.updateHud();
  }

  updateHud() {
    const ammoStr = this.gun.reloading ? "RELOADING" : `${this.gun.ammoInMag}/${this.gun.stats.magazineSize}`;
    this.hudText.setText(
      [
        `Round: ${this.round}`,
        `Lives: ${this.lives}`,
        `Money: $${this.money}`,
        `Ammo: ${ammoStr}`,
        `DMG: ${this.gun.stats.damage}  Fire rate: ${this.gun.stats.fireRateMs}ms  Reload: ${this.gun.stats.reloadMs}ms`,
      ].join("   |   ")
    );
  }

  goToShop() {
    this.registry.set("gunStats", this.gun.stats);
    this.registry.set("round", this.round + 1);
    this.registry.set("money", this.money);
    this.registry.set("lives", this.lives);
    this.scene.start("ShopScene");
  }

  restart() {
    this.registry.set("gunStats", undefined);
    this.registry.set("round", 1);
    this.registry.set("money", 0);
    this.registry.set("lives", 5);
    this.scene.start("GameScene");
  }
}
