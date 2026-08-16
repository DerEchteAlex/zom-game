import type { ZombieConfig } from "../entities/Zombie";

export type ZombieType = "normal" | "fast" | "tank";

interface ZombieTypeDef {
  label: string;
  color: number;
  hpMult: number;
  speedMult: number;
  moneyMult: number;
  weight: number; // relative spawn chance
  animKey: string; // Phaser animation key, created in GameScene.create()
  textureKey: string; // texture key prefix used for the first frame (e.g. "zombie-normal" -> "zombie-normal-1")
  width: number; // display width in px
  height: number; // display height in px
}

// Tune these multipliers to taste. They apply on top of the round's base stats.
export const ZOMBIE_TYPES: Record<ZombieType, ZombieTypeDef> = {
  normal: {
    label: "Normal",
    color: 0x4caf50,
    hpMult: 1,
    speedMult: 1,
    moneyMult: 1,
    weight: 70,
    animKey: "walk-normal",
    textureKey: "zombie-normal",
    width: 50,
    height: 65,
  },
  fast: {
    label: "Fast",
    color: 0xffca28,
    hpMult: 0.65,
    speedMult: 3,
    moneyMult: 1.4,
    weight: 20,
    animKey: "walk-fast",
    textureKey: "zombie-fast",
    width: 40,
    height: 55,
  },
  tank: {
    label: "Tank",
    color: 0x8d6e63,
    hpMult: 2.2,
    speedMult: 0.4,
    moneyMult: 2,
    weight: 10,
    animKey: "walk-tank",
    textureKey: "zombie-tank",
    width: 90,
    height: 90,
  },
};

export interface WaveConfig {
  zombieCount: number;
  spawnIntervalMs: number;
}

// Round-level pacing (count, spawn rate). Per-zombie stats now come from
// getZombieConfig() below, since each spawn can be a different type.
export function getWaveConfig(round: number): WaveConfig {
  const zombieCount = 4 + Math.floor(round * 2.5);
  const spawnIntervalMs = Math.max(250, 1400 - round * 50);
  return { zombieCount, spawnIntervalMs };
}

// Picks a zombie type using weighted random selection.
export function pickZombieType(): ZombieType {
  const entries = Object.entries(ZOMBIE_TYPES) as [ZombieType, ZombieTypeDef][];
  const totalWeight = entries.reduce((sum, [, def]) => sum + def.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const [type, def] of entries) {
    roll -= def.weight;
    if (roll <= 0) return type;
  }
  return "normal";
}

// Builds the actual stat block for a specific zombie type at a given round.
export function getZombieConfig(round: number, type: ZombieType): ZombieConfig {
  const baseHp = 40;
  const baseSpeed = 40 + Math.min(round * 2, 40); // cap speed growth from round scaling
  const def = ZOMBIE_TYPES[type];

  const hp = Math.round(baseHp * Math.pow(1.4, round - 1) * def.hpMult);
  const speed = Math.round(baseSpeed * def.speedMult);
  const moneyValue = Math.round((10 + round * 2) * def.moneyMult);

  return {
    hp,
    speed,
    scoreValue: 10 * round,
    moneyValue,
    color: def.color,
    label: def.label,
    animKey: def.animKey,
    textureKey: def.textureKey,
    width: def.width,
    height: def.height,
  };
}
