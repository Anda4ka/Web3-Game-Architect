import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { walletManager } from '../web3/wallet';
import { gameWeb3Service } from '../web3/gameWeb3Service';

interface GameOverData {
  score: number;
  best: number;
  crystals: number;
  distance: number;
  maxCombo: number;
  duration: number;
  telemetry: any[];
}

export class GameOverScene extends Phaser.Scene {
  private claimBtn!: Phaser.GameObjects.Container;
  private badgeBtn!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text | null;
  private data!: GameOverData;
  private runId: number = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    this.data = data;
    this.runId = Date.now();
    this.statusText = null;

    // ─── Background (same as menu: dark sky + stars + mountains) ───
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0e27);

    // Stars
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.4);
    for (let i = 0; i < 40; i++) {
      stars.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, Math.random() * 1.5 + 0.3);
    }

    // Mountains silhouette
    const mt = this.add.graphics();
    mt.fillStyle(0x0d1a33, 0.6);
    mt.beginPath();
    mt.moveTo(0, GAME_HEIGHT);
    mt.lineTo(60, GAME_HEIGHT - 120);
    mt.lineTo(150, GAME_HEIGHT - 80);
    mt.lineTo(250, GAME_HEIGHT - 160);
    mt.lineTo(380, GAME_HEIGHT - 100);
    mt.lineTo(500, GAME_HEIGHT - 180);
    mt.lineTo(620, GAME_HEIGHT - 110);
    mt.lineTo(720, GAME_HEIGHT - 140);
    mt.lineTo(GAME_WIDTH, GAME_HEIGHT - 90);
    mt.lineTo(GAME_WIDTH, GAME_HEIGHT);
    mt.closePath();
    mt.fillPath();

    // Falling snow
    for (let i = 0; i < 15; i++) {
      const flake = this.add.circle(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 2 + 0.5,
        0xffffff,
        Math.random() * 0.3 + 0.05
      );
      this.tweens.add({
        targets: flake,
        y: GAME_HEIGHT + 20,
        x: flake.x + (Math.random() - 0.5) * 60,
        duration: 5000 + Math.random() * 5000,
        repeat: -1,
        delay: Math.random() * 3000,
        onRepeat: () => { flake.setPosition(Math.random() * GAME_WIDTH, -10); },
      });
    }

    // Dim overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35);

    // ─── Game Over title ───
    const title = this.add.text(GAME_WIDTH / 2, 70, 'GAME OVER', {
      fontSize: '52px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ff4444',
      stroke: '#330000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // Title shake-in
    this.tweens.add({
      targets: title,
      scaleX: { from: 1.3, to: 1 },
      scaleY: { from: 1.3, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    // New best indicator
    if (data.score >= data.best && data.score > 0) {
      const nb = this.add.text(GAME_WIDTH / 2, 120, 'NEW BEST!', {
        fontSize: '22px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: '#ffdd00',
        stroke: '#553300',
        strokeThickness: 3,
      }).setOrigin(0.5);
      this.tweens.add({
        targets: nb,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ─── Stats panel ───
    const panelX = GAME_WIDTH / 2;
    const panelY = 230;
    const panelW = 360;
    const panelH = 210;

    this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a2a4a, 0.85)
      .setStrokeStyle(2, 0x00d4ff, 0.4);

    const stats = [
      { label: 'Score', value: data.score.toLocaleString(), color: '#ffffff' },
      { label: 'Best', value: data.best.toLocaleString(), color: data.score >= data.best ? '#ffdd00' : '#ffffff' },
      { label: 'Crystals', value: '+' + data.crystals, color: '#00ffcc' },
      { label: 'Distance', value: data.distance + 'm', color: '#88bbdd' },
      { label: 'Max Combo', value: 'x' + data.maxCombo, color: '#ff88cc' },
    ];

    stats.forEach((stat, i) => {
      const y = panelY - panelH / 2 + 30 + i * 38;

      this.add.text(panelX - panelW / 2 + 30, y, stat.label, {
        fontSize: '17px',
        fontFamily: 'Arial, sans-serif',
        color: '#88bbdd',
      }).setOrigin(0, 0.5);

      const valText = this.add.text(panelX + panelW / 2 - 30, y, stat.value, {
        fontSize: '19px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: stat.color,
      }).setOrigin(1, 0.5).setAlpha(0);

      // Staggered fade-in
      this.tweens.add({
        targets: valText,
        alpha: 1,
        x: { from: panelX + panelW / 2, to: panelX + panelW / 2 - 30 },
        duration: 400,
        delay: 300 + i * 120,
        ease: 'Power2',
      });
    });

    // ─── Buttons ───
    const retryBtn = this.createButton(GAME_WIDTH / 2, 390, 'RETRY', 240, 50, '#00ff88', 0x00aa66, () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => this.scene.start('GameScene'));
    });

    this.createButton(GAME_WIDTH / 2 - 80, 450, 'SHOP', 140, 40, '#00d4ff', 0x1a3355, () => {
      this.scene.start('ShopScene');
    });

    this.createButton(GAME_WIDTH / 2 + 80, 450, 'MENU', 140, 40, '#88bbdd', 0x1a3355, () => {
      this.scene.start('MenuScene');
    });

    // ─── Web3 Buttons ───
    this.createWeb3Buttons();

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private createWeb3Buttons(): void {
    const isConnected = walletManager.isConnected();
    const btnW = 320;
    const btnH = 45;
    const claimY = 515;

    // 1. Submit to Leaderboard Button
    if (isConnected) {
      this.claimBtn = this.createWeb3Button(GAME_WIDTH / 2, claimY, `\u{1F3C6} SUBMIT TO LEADERBOARD`, btnW, btnH, 0x00d4ff, async () => {
        await this.handleClaim();
      });
    } else if (!isConnected) {
      this.add.text(GAME_WIDTH / 2, claimY, 'Connect wallet to enter tournaments', {
        fontSize: '12px',
        color: '#667788',
        fontStyle: 'italic'
      }).setOrigin(0.5);
    }

    // 2. Mint Season Badge (if score >= 10000)
    if (isConnected && this.data.score >= 10000) {
      const badgeY = 565;
      this.badgeBtn = this.createWeb3Button(GAME_WIDTH / 2, badgeY, '\u{1F3C5} MINT SEASON BADGE NFT', btnW, btnH, 0xf0a500, async () => {
        await this.handleMintBadge();
      });
    }
  }

  private createWeb3Button(x: number, y: number, label: string, w: number, h: number, color: number, callback: () => Promise<void>): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, w, h, color, 0.2)
      .setStrokeStyle(2, color, 0.6)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#' + color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);

    const container = this.add.container(x, y, [bg, text]);

    bg.on('pointerover', () => {
      bg.setFillStyle(color, 0.4);
      text.setScale(1.02);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(color, 0.2);
      text.setScale(1);
    });
    bg.on('pointerdown', async () => {
      bg.disableInteractive();
      bg.setAlpha(0.5);
      text.setText('Processing...');
      await callback();
    });

    return container;
  }

  private async handleClaim(): Promise<void> {
    try {
      this.showStatus('Submitting score to leaderboard...', '#ffffff');
      
      const logs = {
        score: this.data.score,
        crystals: this.data.crystals,
        durationMs: this.data.duration,
        telemetry: this.data.telemetry
      };

      await gameWeb3Service.submitRun(logs);
      
      this.showStatus('Score submitted successfully!', '#00ff88');
      if (this.claimBtn) {
        const text = this.claimBtn.list[1] as Phaser.GameObjects.Text;
        text.setText('\u2705 SUBMITTED');
        (this.claimBtn.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0x00ff88, 0.1).setStrokeStyle(2, 0x00ff88, 0.3);
      }
    } catch (err: any) {
      console.error(err);
      this.showStatus(err.message || 'Submission failed', '#ff4444');
      if (this.claimBtn) {
        const text = this.claimBtn.list[1] as Phaser.GameObjects.Text;
        const bg = this.claimBtn.list[0] as Phaser.GameObjects.Rectangle;
        text.setText('RETRY SUBMIT');
        bg.setInteractive();
        bg.setAlpha(1);
      }
    }
  }

  private async handleMintBadge(): Promise<void> {
    try {
      this.showStatus('Requesting badge authorization...', '#ffffff');
      
      const seasonId = 1; // Current season
      const txHash = await gameWeb3Service.mintSeasonBadge(seasonId, this.data.score);
      
      this.showStatus('NFT Badge minted successfully!', '#00ff88');
      if (this.badgeBtn) {
        const text = this.badgeBtn.list[1] as Phaser.GameObjects.Text;
        text.setText('\u2705 BADGE MINTED');
        (this.badgeBtn.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0x00ff88, 0.1).setStrokeStyle(2, 0x00ff88, 0.3);
      }
    } catch (err: any) {
      console.error(err);
      this.showStatus(err.message || 'Minting failed', '#ff4444');
      if (this.badgeBtn) {
        const text = this.badgeBtn.list[1] as Phaser.GameObjects.Text;
        const bg = this.badgeBtn.list[0] as Phaser.GameObjects.Rectangle;
        text.setText('RETRY MINT');
        bg.setInteractive();
        bg.setAlpha(1);
      }
    }
  }

  private showStatus(msg: string, color: string): void {
    if (this.statusText) this.statusText.destroy();
    this.statusText = this.add.text(GAME_WIDTH / 2, 490, msg, {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: color
    }).setOrigin(0.5);
  }

  private createButton(
    x: number, y: number, label: string,
    w: number, h: number,
    textColor: string, bgColor: number,
    callback: () => void
  ): Phaser.GameObjects.Rectangle {
    const bg = this.add.rectangle(x, y, w, h, bgColor, 0.85)
      .setStrokeStyle(2, 0x00d4ff, 0.5)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: h > 42 ? '22px' : '17px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: textColor,
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x00d4ff, 0.3);
      text.setColor('#ffffff');
      text.setScale(1.05);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor, 0.85);
      text.setColor(textColor);
      text.setScale(1);
    });
    bg.on('pointerdown', callback);

    return bg;
  }
}
