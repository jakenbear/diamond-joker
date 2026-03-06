/**
 * main.js - Phaser config + bootstrap
 */
import TitleScene from './scenes/TitleScene.js';
import TeamSelectScene from './scenes/TeamSelectScene.js';
import GameScene from './scenes/GameScene.js';
import PitchingScene from './scenes/PitchingScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import ShopScene from './scenes/ShopScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: 0x1b5e20,
  parent: document.body,
  scene: [TitleScene, TeamSelectScene, GameScene, PitchingScene, GameOverScene, ShopScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

window.game = new Phaser.Game(config);
