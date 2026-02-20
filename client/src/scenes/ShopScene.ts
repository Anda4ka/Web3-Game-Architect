import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UPGRADES, UpgradeConfig } from '../config/gameConfig';
import { sfxBuy, sfxError } from '../systems/SoundManager';

export class ShopScene extends Phaser.Scene {
  private crystalBalance: number = 0;
  private balanceText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    this.crystalBalance = parseInt(localStorage.getItem('frost_rush_crystals') || '0', 10);

    // Background with stars
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0e27);
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 30; i++) {
      stars.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, Math.random() * 1.2 + 0.3);
    }

    // Title
    this.add.text(GAME_WIDTH / 2, 35, 'UPGRADE SHOP', {
      fontSize: '34px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#00d4ff',
      stroke: '#003366',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Crystal balance
    this.balanceText = this.add.text(GAME_WIDTH / 2, 72, '\u{1F48E} ' + this.crystalBalance, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#00ffcc',
      stroke: '#003322',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Toast (hidden)
    this.toastText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#220000cc',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    // Upgrade cards
    UPGRADES.forEach((upgrade, index) => {
      this.createUpgradeCard(upgrade, index);
    });

    // Back button
    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 45, 'BACK TO MENU', () => {
      this.scene.start('MenuScene');
    });
  }

  private createUpgradeCard(upgrade: UpgradeConfig, index: number): void {
    const cardW = 360;
    const cardH = 88;
    const cardX = GAME_WIDTH / 2;
    const cardY = 130 + index * 100;

    const currentLevel = this.getUpgradeLevel(upgrade.key);
    const isMaxed = currentLevel >= upgrade.maxLevel;
    const cost = isMaxed ? 0 : upgrade.costs[currentLevel];
    const canAfford = !isMaxed && this.crystalBalance >= cost;

    // Card background
    const borderCol = isMaxed ? 0x00ff88 : canAfford ? 0x00d4ff : 0x553344;
    this.add.rectangle(cardX, cardY, cardW, cardH, 0x1a2a4a, 0.8)
      .setStrokeStyle(2, borderCol, isMaxed ? 0.7 : 0.5);

    // Name
    this.add.text(cardX - cardW / 2 + 15, cardY - 24, upgrade.name, {
      fontSize: '19px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    // Description
    this.add.text(cardX - cardW / 2 + 15, cardY + 1, upgrade.description, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#88bbdd',
    }).setOrigin(0, 0.5);

    // Level indicator (dots)
    const dotStartX = cardX - cardW / 2 + 15;
    const dotY = cardY + 26;
    for (let i = 0; i < upgrade.maxLevel; i++) {
      const filled = i < currentLevel;
      const dotCol = filled ? 0x00ffcc : 0x334455;
      this.add.circle(dotStartX + i * 18, dotY, 5, dotCol, filled ? 1 : 0.5)
        .setStrokeStyle(1, 0x00ffcc, filled ? 0.8 : 0.2);
    }

    // Level text
    const levelStr = isMaxed ? 'MAX' : 'Lv ' + currentLevel + '/' + upgrade.maxLevel;
    this.add.text(dotStartX + upgrade.maxLevel * 18 + 5, dotY, levelStr, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: isMaxed ? '#00ff88' : '#aaccee',
    }).setOrigin(0, 0.5);

    // Buy button area
    const btnX = cardX + cardW / 2 - 60;
    if (isMaxed) {
      // Maxed badge
      this.add.text(btnX, cardY, '\u2713 MAX', {
        fontSize: '16px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: '#00ff88',
      }).setOrigin(0.5);
    } else {
      const btnColor = canAfford ? 0x00aa66 : 0x332233;
      const btnAlpha = canAfford ? 0.9 : 0.5;
      const btnTextColor = canAfford ? '#ffffff' : '#665566';

      const buyBg = this.add.rectangle(btnX, cardY, 100, 42, btnColor, btnAlpha)
        .setStrokeStyle(1, canAfford ? 0x00ffaa : 0x443344, canAfford ? 0.6 : 0.3);

      const buyText = this.add.text(btnX, cardY, cost + ' cr', {
        fontSize: '16px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: btnTextColor,
      }).setOrigin(0.5);

      buyBg.setInteractive({ useHandCursor: canAfford });

      if (canAfford) {
        buyBg.on('pointerover', () => {
          buyBg.setFillStyle(0x00cc77, 1);
        });
        buyBg.on('pointerout', () => {
          buyBg.setFillStyle(0x00aa66, 0.9);
        });
        buyBg.on('pointerdown', () => {
          sfxBuy();
          this.purchaseUpgrade(upgrade.key, cost);
        });
      } else {
        // Click shows "not enough" toast
        buyBg.on('pointerdown', () => {
          sfxError();
          this.showToast('Not enough crystals! Need ' + cost + ' \u{1F48E}');
        });
      }
    }
  }

  private showToast(msg: string): void {
    this.toastText.setText(msg);
    this.toastText.setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      duration: 2000,
      delay: 800,
      ease: 'Power2',
    });
  }

  private purchaseUpgrade(key: string, cost: number): void {
    this.crystalBalance -= cost;
    localStorage.setItem('frost_rush_crystals', this.crystalBalance.toString());

    const currentLevel = this.getUpgradeLevel(key);
    localStorage.setItem('frost_upgrade_' + key, (currentLevel + 1).toString());

    // Success flash
    this.cameras.main.flash(200, 0, 255, 150);
    this.scene.restart();
  }

  private getUpgradeLevel(key: string): number {
    return parseInt(localStorage.getItem('frost_upgrade_' + key) || '0', 10);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): void {
    const btnW = 220;
    const btnH = 45;

    const bg = this.add.rectangle(x, y, btnW, btnH, 0x1a3355, 0.8)
      .setStrokeStyle(2, 0x00d4ff, 0.5)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x00d4ff, 0.3);
      text.setColor('#00ffff');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x1a3355, 0.8);
      text.setColor('#ffffff');
    });
    bg.on('pointerdown', callback);
  }
}
