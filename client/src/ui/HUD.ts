import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '../config/gameConfig';
import { ScoreManager } from '../systems/ScoreManager';
import { ComboManager } from '../systems/ComboManager';

export class HUD {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private crystalText!: Phaser.GameObjects.Text;
  private boostText!: Phaser.GameObjects.Text;
  private floatingTexts: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    // Score — top center
    this.scoreText = this.scene.add.text(GAME_WIDTH / 2, 20, 'SCORE: 0', {
      fontSize: '28px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#001133',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(100);

    // Combo — top right
    this.comboText = this.scene.add.text(GAME_WIDTH - 20, 20, '', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#00ffcc',
      stroke: '#003322',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(100);

    // Crystals — top left
    this.crystalText = this.scene.add.text(20, 20, '💎 0', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#00ffcc',
    }).setOrigin(0, 0).setDepth(100);

    // Boost indicator — below crystals
    this.boostText = this.scene.add.text(20, 50, '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffdd00',
    }).setOrigin(0, 0).setDepth(100);
  }

  update(scoreManager: ScoreManager, comboManager: ComboManager, boosts: string[]): void {
    this.scoreText.setText(`SCORE: ${scoreManager.score}`);
    this.crystalText.setText(`💎 ${scoreManager.crystals}`);

    const multiplier = comboManager.getMultiplier();
    if (multiplier > 1) {
      this.comboText.setText(`x${multiplier} COMBO`);
      this.comboText.setVisible(true);
    } else {
      this.comboText.setVisible(false);
    }

    // Active boosts
    if (boosts.length > 0) {
      this.boostText.setText(boosts.join(' | ').toUpperCase());
      this.boostText.setVisible(true);
    } else {
      this.boostText.setVisible(false);
    }

    // Clean up floating texts
    this.floatingTexts = this.floatingTexts.filter((t) => t.active);
  }

  showFloatingScore(x: number, y: number, text: string, color: string = '#00ffcc'): void {
    const floater = this.scene.add.text(x, y, text, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(101);

    this.floatingTexts.push(floater);

    this.scene.tweens.add({
      targets: floater,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        floater.destroy();
      },
    });
  }

  destroy(): void {
    this.scoreText.destroy();
    this.comboText.destroy();
    this.crystalText.destroy();
    this.boostText.destroy();
    this.floatingTexts.forEach((t) => t.destroy());
  }
}
