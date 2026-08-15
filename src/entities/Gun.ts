export interface GunStats {
  damage: number;
  fireRateMs: number; // time between shots
  reloadMs: number;
  magazineSize: number;
}

export class Gun {
  stats: GunStats;
  ammoInMag: number;
  lastShotAt = 0;
  reloading = false;
  reloadStartedAt = 0;

  constructor(stats: GunStats) {
    this.stats = stats;
    this.ammoInMag = stats.magazineSize;
  }

  canShoot(now: number): boolean {
    if (this.reloading) return false;
    if (this.ammoInMag <= 0) return false;
    return now - this.lastShotAt >= this.stats.fireRateMs;
  }

  shoot(now: number) {
    this.ammoInMag -= 1;
    this.lastShotAt = now;
    if (this.ammoInMag <= 0) {
      this.startReload(now);
    }
  }

  startReload(now: number) {
    if (this.reloading) return;
    this.reloading = true;
    this.reloadStartedAt = now;
  }

  update(now: number) {
    if (this.reloading && now - this.reloadStartedAt >= this.stats.reloadMs) {
      this.reloading = false;
      this.ammoInMag = this.stats.magazineSize;
    }
  }

  reloadProgress(now: number): number {
    if (!this.reloading) return 1;
    return Math.min(1, (now - this.reloadStartedAt) / this.stats.reloadMs);
  }
}

// Upgrade cost curve: each level costs more. Tweak freely for balance.
export function nextUpgradeCost(currentLevel: number, base: number): number {
  return Math.round(base * Math.pow(1.35, currentLevel));
}
