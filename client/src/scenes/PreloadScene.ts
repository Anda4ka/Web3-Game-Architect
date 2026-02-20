import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  OBSTACLE_WIDTH,
  OBSTACLE_HEIGHT,
  CRYSTAL_WIDTH,
  CRYSTAL_HEIGHT,
  BOOST_WIDTH,
  BOOST_HEIGHT,
  COLORS,
} from '../config/gameConfig';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Show loading bar
    const barW = 320;
    const barH = 20;
    const barX = (GAME_WIDTH - barW) / 2;
    const barY = GAME_HEIGHT / 2;

    const bg = this.add.rectangle(GAME_WIDTH / 2, barY, barW, barH, 0x1a3355);
    const bar = this.add.rectangle(barX + 2, barY, 0, barH - 4, 0x00d4ff).setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      bar.width = (barW - 4) * value;
    });

    // Generate placeholder textures
    this.generateTextures();
  }

  create(): void {
    this.scene.start('MenuScene');
  }

  private generateTextures(): void {
    // Player
    const playerGfx = this.add.graphics();
    playerGfx.setVisible(false);
    playerGfx.fillStyle(COLORS.player, 1);
    playerGfx.fillRoundedRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT, 8);
    // Head
    playerGfx.fillStyle(0xffffff, 0.9);
    playerGfx.fillCircle(PLAYER_WIDTH / 2, 14, 10);
    // Eyes
    playerGfx.fillStyle(0x0a0e27, 1);
    playerGfx.fillCircle(PLAYER_WIDTH / 2 - 4, 12, 2);
    playerGfx.fillCircle(PLAYER_WIDTH / 2 + 4, 12, 2);
    playerGfx.generateTexture('player', PLAYER_WIDTH, PLAYER_HEIGHT);
    playerGfx.destroy();

    // Obstacles
    this.generateObstacleTexture('ice_spike', COLORS.ice_spike, 'spike');
    this.generateObstacleTexture('broken_bridge', COLORS.broken_bridge, 'bridge');
    this.generateObstacleTexture('falling_icicle', COLORS.falling_icicle, 'icicle');
    this.generateObstacleTexture('sliding_block', COLORS.sliding_block, 'block');
    this.generateObstacleTexture('ice_pit', COLORS.ice_pit, 'pit');

    // Crystal
    const crystalGfx = this.add.graphics();
    crystalGfx.setVisible(false);
    crystalGfx.fillStyle(COLORS.crystal, 1);
    // Diamond shape
    crystalGfx.fillPoints([
      new Phaser.Geom.Point(CRYSTAL_WIDTH / 2, 0),
      new Phaser.Geom.Point(CRYSTAL_WIDTH, CRYSTAL_HEIGHT / 2),
      new Phaser.Geom.Point(CRYSTAL_WIDTH / 2, CRYSTAL_HEIGHT),
      new Phaser.Geom.Point(0, CRYSTAL_HEIGHT / 2),
    ], true);
    crystalGfx.generateTexture('crystal', CRYSTAL_WIDTH, CRYSTAL_HEIGHT);
    crystalGfx.destroy();

    // Boosts
    this.generateBoostTexture('shield', COLORS.shield);
    this.generateBoostTexture('magnet', COLORS.magnet);
    this.generateBoostTexture('slow_time', COLORS.slow_time);

    // Particles
    const particleGfx = this.add.graphics();
    particleGfx.setVisible(false);
    particleGfx.fillStyle(0xffffff, 1);
    particleGfx.fillCircle(4, 4, 4);
    particleGfx.generateTexture('particle', 8, 8);
    particleGfx.destroy();

    // Snow particle
    const snowGfx = this.add.graphics();
    snowGfx.setVisible(false);
    snowGfx.fillStyle(0xffffff, 0.6);
    snowGfx.fillCircle(3, 3, 3);
    snowGfx.generateTexture('snow', 6, 6);
    snowGfx.destroy();
  }

  private generateObstacleTexture(key: string, color: number, shape: string): void {
    const gfx = this.add.graphics();
    gfx.setVisible(false);
    gfx.fillStyle(color, 1);

    switch (shape) {
      case 'spike':
        gfx.fillTriangle(
          OBSTACLE_WIDTH / 2, 0,
          OBSTACLE_WIDTH, OBSTACLE_HEIGHT,
          0, OBSTACLE_HEIGHT
        );
        break;
      case 'bridge':
        gfx.fillRect(0, OBSTACLE_HEIGHT / 2, OBSTACLE_WIDTH, OBSTACLE_HEIGHT / 2);
        gfx.fillStyle(color, 0.6);
        gfx.fillRect(5, OBSTACLE_HEIGHT / 2 - 5, OBSTACLE_WIDTH - 10, 5);
        break;
      case 'icicle':
        gfx.fillTriangle(
          OBSTACLE_WIDTH / 2, OBSTACLE_HEIGHT,
          OBSTACLE_WIDTH - 5, 0,
          5, 0
        );
        break;
      case 'block':
        gfx.fillRoundedRect(0, 0, OBSTACLE_WIDTH, OBSTACLE_HEIGHT, 4);
        gfx.lineStyle(2, 0xffffff, 0.3);
        gfx.strokeRoundedRect(0, 0, OBSTACLE_WIDTH, OBSTACLE_HEIGHT, 4);
        break;
      case 'pit':
        gfx.fillRect(0, OBSTACLE_HEIGHT - 15, OBSTACLE_WIDTH, 15);
        gfx.fillStyle(0x000022, 0.8);
        gfx.fillEllipse(OBSTACLE_WIDTH / 2, OBSTACLE_HEIGHT - 15, OBSTACLE_WIDTH, 20);
        break;
    }

    gfx.generateTexture(key, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
    gfx.destroy();
  }

  private generateBoostTexture(key: string, color: number): void {
    const gfx = this.add.graphics();
    gfx.setVisible(false);
    // Outer glow circle
    gfx.fillStyle(color, 0.3);
    gfx.fillCircle(BOOST_WIDTH / 2, BOOST_HEIGHT / 2, BOOST_WIDTH / 2);
    // Inner circle
    gfx.fillStyle(color, 1);
    gfx.fillCircle(BOOST_WIDTH / 2, BOOST_HEIGHT / 2, BOOST_WIDTH / 3);
    // Icon indicator
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(BOOST_WIDTH / 2, BOOST_HEIGHT / 2, 5);
    gfx.generateTexture(key, BOOST_WIDTH, BOOST_HEIGHT);
    gfx.destroy();
  }
}
