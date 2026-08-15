import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { ShopScene } from "./scenes/ShopScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  parent: "app",
  backgroundColor: "#2b2b2b",
  scene: [GameScene, ShopScene],
});
