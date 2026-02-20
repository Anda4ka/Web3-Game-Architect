import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { walletManager } from '../web3/wallet';
import { gameWeb3Service } from '../web3/gameWeb3Service';

export class MenuScene extends Phaser.Scene {
  private walletBtnBg!: Phaser.GameObjects.Rectangle;
  private walletBtnText!: Phaser.GameObjects.Text;
  private walletHintText!: Phaser.GameObjects.Text;
  private walletStatusText!: Phaser.GameObjects.Text | null;
  private frostBalanceText!: Phaser.GameObjects.Text | null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.frostBalanceText = null;
    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0e27);

    // Stars
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 50; i++) {
      stars.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, Math.random() * 1.5 + 0.3);
    }

    // Animated snow particles (simple circles falling)
    for (let i = 0; i < 20; i++) {
      const flake = this.add.circle(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 2 + 1,
        0xffffff,
        Math.random() * 0.4 + 0.1
      );
      this.tweens.add({
        targets: flake,
        y: GAME_HEIGHT + 20,
        x: flake.x + (Math.random() - 0.5) * 80,
        duration: 4000 + Math.random() * 6000,
        repeat: -1,
        delay: Math.random() * 3000,
        onRepeat: () => {
          flake.setPosition(Math.random() * GAME_WIDTH, -10);
        },
      });
    }

    // Title glow background
    const glowG = this.add.graphics();
    glowG.fillStyle(0x00d4ff, 0.05);
    glowG.fillEllipse(GAME_WIDTH / 2, 130, 500, 120);

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 120, 'FROST RUSH', {
      fontSize: '64px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#00d4ff',
      stroke: '#003366',
      strokeThickness: 6,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#001133',
        blur: 10,
        fill: true,
      },
    }).setOrigin(0.5);

    // Subtle title pulse
    this.tweens.add({
      targets: title,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(GAME_WIDTH / 2, 180, 'Endless Ice Runner', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#6699bb',
    }).setOrigin(0.5);

    // Crystal balance
    const crystals = parseInt(localStorage.getItem('frost_rush_crystals') || '0', 10);
    const best = parseInt(localStorage.getItem('frost_rush_best') || '0', 10);
    
    this.add.text(GAME_WIDTH / 2, 210, `\u{1F48E} ${crystals}   \u{1F3C6} Best: ${best}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#558899',
    }).setOrigin(0.5);

    this.frostBalanceText = this.add.text(GAME_WIDTH / 2, 230, '', {
      fontSize: '14px',
      fontFamily: 'Arial Black',
      color: '#00d4ff',
    }).setOrigin(0.5);

    if (walletManager.isConnected()) {
      this.refreshFrostBalance();
    }

    // ─── PLAY button (big, prominent, pulsing) ───
    const playY = 310;
    const playW = 280;
    const playH = 65;

    const playGlow = this.add.rectangle(GAME_WIDTH / 2, playY, playW + 8, playH + 8, 0x00d4ff, 0.15);
    this.tweens.add({
      targets: playGlow,
      alpha: 0.05,
      scaleX: 1.06,
      scaleY: 1.1,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const playBg = this.add.rectangle(GAME_WIDTH / 2, playY, playW, playH, 0x00aa66, 0.9)
      .setStrokeStyle(2, 0x00ffaa, 0.7)
      .setInteractive({ useHandCursor: true });

    const playText = this.add.text(GAME_WIDTH / 2, playY, '\u25B6  PLAY', {
      fontSize: '30px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Play button hover
    playBg.on('pointerover', () => {
      playBg.setFillStyle(0x00cc77, 1);
      playText.setColor('#ffffff');
      playText.setScale(1.05);
    });
    playBg.on('pointerout', () => {
      playBg.setFillStyle(0x00aa66, 0.9);
      playText.setScale(1);
    });
    playBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    });

    // ─── Secondary buttons (smaller, muted) ───
    this.createSecondaryButton(GAME_WIDTH / 2 - 90, 410, '\u{1F6D2} SHOP', () => {
      this.scene.start('ShopScene');
    });

    this.createSecondaryButton(GAME_WIDTH / 2 + 90, 410, '\u{1F3C6} RANKS', () => {
      this.scene.start('LeaderboardScene');
    });

    // ─── Wallet Connect Button ───
    this.walletStatusText = null;
    this.createWalletButton();

    // Controls hint
    this.add.text(GAME_WIDTH / 2, 540, '\u2190 \u2192  Switch lanes   |   \u2191 Jump   |   \u2193 Slide', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#445566',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 558, 'Mobile: Swipe left/right/up/down', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#334455',
    }).setOrigin(0.5);

    // Version
    this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, 'v0.3 MVP', {
      fontSize: '11px',
      color: '#223344',
    }).setOrigin(1, 1);

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private createWalletButton(): void {
    const walletY = 465;
    const btnW = 240;
    const btnH = 40;

    // Check if already connected
    const alreadyConnected = walletManager.isConnected();
    const initialColor = alreadyConnected ? 0x00ff88 : 0xf0a500;
    const initialText = alreadyConnected
      ? walletManager.truncateAddress()
      : '\u{1F512} CONNECT WALLET';

    // Button background
    this.walletBtnBg = this.add
      .rectangle(GAME_WIDTH / 2, walletY, btnW, btnH, initialColor, 0.85)
      .setStrokeStyle(1, 0xffffff, 0.2)
      .setInteractive({ useHandCursor: true });

    // Button text
    this.walletBtnText = this.add
      .text(GAME_WIDTH / 2, walletY, initialText, {
        fontSize: '15px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: alreadyConnected ? '#003322' : '#1a1a00',
      })
      .setOrigin(0.5);

    // Hint text below button
    this.walletHintText = this.add
      .text(GAME_WIDTH / 2, walletY + 28, 'Required for NFT badges & $FROST rewards', {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#556677',
      })
      .setOrigin(0.5);

    // If already connected, store in registry
    if (alreadyConnected) {
      this.registry.set('walletAddress', walletManager.getAddress());
    }

    // Hover effects
    this.walletBtnBg.on('pointerover', () => {
      if (walletManager.isConnected()) {
        this.walletBtnBg.setFillStyle(0x00ff88, 1);
      } else {
        this.walletBtnBg.setFillStyle(0xffbb33, 1);
        this.walletBtnText.setScale(1.03);
      }
    });

    this.walletBtnBg.on('pointerout', () => {
      if (walletManager.isConnected()) {
        this.walletBtnBg.setFillStyle(0x00ff88, 0.85);
      } else {
        this.walletBtnBg.setFillStyle(0xf0a500, 0.85);
        this.walletBtnText.setScale(1);
      }
    });

    // Click handler
    this.walletBtnBg.on('pointerdown', () => {
      if (walletManager.isConnected()) {
        // Already connected — just show address (no action)
        return;
      }
      this.handleWalletConnect();
    });

    // Listen for external wallet events
    walletManager.onConnect((addr: string) => {
      this.updateWalletUI(addr);
    });

    walletManager.onDisconnect(() => {
      this.updateWalletUIDisconnected();
    });
  }

  private async handleWalletConnect(): Promise<void> {
    // Disable button during connection
    this.walletBtnText.setText('Connecting...');
    this.walletBtnBg.disableInteractive();

    try {
      const address = await walletManager.connect();

      // Try switching to Avalanche (non-blocking — don't fail if user rejects chain switch)
      try {
        await walletManager.switchToAvalanche();
      } catch {
        // User may reject chain switch — that's okay, wallet is still connected
      }

      this.updateWalletUI(address);
    } catch (err: unknown) {
      const error = err as { message?: string };
      let msg = 'Connection failed';

      if (error.message === 'USER_REJECTED') {
        msg = 'Connection cancelled';
      } else if (error.message === 'NO_WALLET') {
        msg = 'No wallet found — install MetaMask';
      } else if (error.message === 'NO_WALLET_MOBILE') {
        msg = 'Open in wallet browser';
      } else if (error.message === 'NO_ACCOUNTS') {
        msg = 'No accounts found';
      }

      this.showWalletStatus(msg, '#ff4444');

      // Reset button after brief delay
      this.time.delayedCall(2000, () => {
        this.updateWalletUIDisconnected();
      });
    } finally {
      this.walletBtnBg.setInteractive({ useHandCursor: true });
    }
  }

  private async refreshFrostBalance(): Promise<void> {
    try {
      const balance = await gameWeb3Service.getFrostBalance();
      if (this.frostBalanceText) {
        this.frostBalanceText.setText(`$FROST: ${parseFloat(balance).toFixed(2)}`);
      }
    } catch (err) {
      console.error('Failed to fetch balance', err);
    }
  }

  private updateWalletUI(address: string): void {
    this.walletBtnBg.setFillStyle(0x00ff88, 0.85);
    this.walletBtnBg.setStrokeStyle(1, 0x00ff88, 0.4);
    this.walletBtnText.setText(walletManager.truncateAddress(address));
    this.walletBtnText.setColor('#003322');
    this.walletBtnText.setScale(1);
    this.registry.set('walletAddress', address);
    this.showWalletStatus('Connected to Avalanche', '#00ff88');
    this.refreshFrostBalance();
  }

  private updateWalletUIDisconnected(): void {
    this.walletBtnBg.setFillStyle(0xf0a500, 0.85);
    this.walletBtnBg.setStrokeStyle(1, 0xffffff, 0.2);
    this.walletBtnText.setText('\u{1F512} CONNECT WALLET');
    this.walletBtnText.setColor('#1a1a00');
    this.walletBtnText.setScale(1);
    this.registry.set('walletAddress', null);
    if (this.frostBalanceText) this.frostBalanceText.setText('');
    if (this.walletStatusText) {
      this.walletStatusText.destroy();
      this.walletStatusText = null;
    }
  }

  private showWalletStatus(message: string, color: string): void {
    if (this.walletStatusText) {
      this.walletStatusText.destroy();
    }
    this.walletStatusText = this.add
      .text(GAME_WIDTH / 2, 510, message, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: color,
      })
      .setOrigin(0.5);

    // Auto-remove after 3 seconds
    this.time.delayedCall(3000, () => {
      if (this.walletStatusText) {
        this.walletStatusText.destroy();
        this.walletStatusText = null;
      }
    });
  }

  private createSecondaryButton(x: number, y: number, label: string, callback: () => void): void {
    const btnW = 150;
    const btnH = 42;

    const bg = this.add.rectangle(x, y, btnW, btnH, 0x1a3355, 0.7)
      .setStrokeStyle(1, 0x00d4ff, 0.3)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#88bbdd',
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x00d4ff, 0.2);
      text.setColor('#00ffff');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x1a3355, 0.7);
      text.setColor('#88bbdd');
    });
    bg.on('pointerdown', callback);
  }
}
