import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

const FAKE_PLAYERS = [
  { name: 'IceRunner_99', score: 4200 },
  { name: 'FrostByte', score: 3150 },
  { name: 'SnowDash', score: 2800 },
  { name: 'CrystalKing', score: 1950 },
];

export class LeaderboardScene extends Phaser.Scene {
  private activeTab: string = 'DAILY';

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  init(data: { tab?: string }): void {
    if (data && data.tab) this.activeTab = data.tab;
  }

  create(): void {
    // Background with stars
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0e27);
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 30; i++) {
      stars.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, Math.random() * 1.2 + 0.3);
    }

    // Title
    this.add.text(GAME_WIDTH / 2, 35, 'LEADERBOARD', {
      fontSize: '34px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#00d4ff',
      stroke: '#003366',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Tabs
    const tabY = 82;
    this.createTab(GAME_WIDTH / 2 - 80, tabY, 'DAILY', this.activeTab === 'DAILY');
    this.createTab(GAME_WIDTH / 2 + 80, tabY, 'SEASON', this.activeTab === 'SEASON');

    // Get local scores
    const bestScore = parseInt(localStorage.getItem('frost_rush_best') || '0', 10);

    // Build entries — merge player with fakes
    const allEntries = [...FAKE_PLAYERS.map(f => ({ ...f }))];
    if (bestScore > 0) {
      allEntries.push({ name: 'You', score: bestScore });
    }
    // Sort descending
    allEntries.sort((a, b) => b.score - a.score);
    // Take top 5
    const entries = allEntries.slice(0, 5);

    // If season tab, show different fake data
    const seasonEntries = this.activeTab === 'SEASON' ? [
      { name: bestScore > 0 ? 'You' : 'IceRunner_99', score: bestScore > 0 ? bestScore : 4200 },
      { name: 'FrostByte', score: 12400 },
      { name: 'SnowDash', score: 9800 },
      { name: 'CrystalKing', score: 7600 },
      { name: 'BlizzardX', score: 5200 },
    ].sort((a, b) => b.score - a.score).slice(0, 5) : entries;

    const displayEntries = this.activeTab === 'SEASON' ? seasonEntries : entries;

    // Panel
    const panelX = GAME_WIDTH / 2;
    const panelY = 280;
    const panelW = 420;
    const panelH = 280;

    this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a2a4a, 0.6)
      .setStrokeStyle(1, 0x00d4ff, 0.3);

    // Header row
    const headerY = panelY - panelH / 2 + 25;
    this.add.text(panelX - panelW / 2 + 25, headerY, '#', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#667799',
    });
    this.add.text(panelX - panelW / 2 + 60, headerY, 'PLAYER', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#667799',
    });
    this.add.text(panelX + panelW / 2 - 25, headerY, 'SCORE', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#667799',
    }).setOrigin(1, 0);

    // Divider
    const divG = this.add.graphics();
    divG.lineStyle(1, 0x334466, 0.5);
    divG.lineBetween(panelX - panelW / 2 + 15, headerY + 18, panelX + panelW / 2 - 15, headerY + 18);

    // Entries
    displayEntries.forEach((entry, i) => {
      const y = headerY + 38 + i * 46;
      const isPlayer = entry.name === 'You';
      const rank = i + 1;

      // Highlight player row
      if (isPlayer) {
        this.add.rectangle(panelX, y + 4, panelW - 20, 40, 0x00ffcc, 0.08)
          .setStrokeStyle(1, 0x00ffcc, 0.2);
      }

      // Medal for top 3
      const rankColors = ['#ffdd00', '#cccccc', '#cc8844'];
      const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
      const rankCol = rank <= 3 ? rankColors[rank - 1] : '#667799';

      // Rank
      const rankStr = rank <= 3 ? medals[rank - 1] : '' + rank;
      this.add.text(panelX - panelW / 2 + 25, y, rankStr, {
        fontSize: '18px', fontFamily: 'Arial Black, Arial, sans-serif', color: rankCol,
      }).setOrigin(0, 0.5);

      // Name
      this.add.text(panelX - panelW / 2 + 60, y, entry.name, {
        fontSize: '17px', fontFamily: 'Arial, sans-serif',
        color: isPlayer ? '#00ffcc' : '#ccddee',
        fontStyle: isPlayer ? 'bold' : 'normal',
      }).setOrigin(0, 0.5);

      // Score
      this.add.text(panelX + panelW / 2 - 25, y, entry.score > 0 ? entry.score.toLocaleString() : '-', {
        fontSize: '17px', fontFamily: 'Arial Black, Arial, sans-serif',
        color: isPlayer ? '#00ffcc' : '#ffffff',
      }).setOrigin(1, 0.5);
    });

    // Empty state
    if (displayEntries.length === 0) {
      this.add.text(panelX, panelY, 'Play a game to see your score here!', {
        fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#556688',
      }).setOrigin(0.5);
    }

    // Info text
    this.add.text(GAME_WIDTH / 2, panelY + panelH / 2 + 20, 'Connect wallet for global leaderboard', {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#445566',
    }).setOrigin(0.5);

    // Back button
    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 45, 'BACK TO MENU', () => {
      this.scene.start('MenuScene');
    });
  }

  private createTab(x: number, y: number, label: string, active: boolean): void {
    const bg = this.add.rectangle(x, y, 140, 34, active ? 0x00d4ff : 0x1a3355, active ? 0.3 : 0.5)
      .setStrokeStyle(2, active ? 0x00d4ff : 0x334466, active ? 0.8 : 0.3)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: active ? '#00ffff' : '#667799',
    }).setOrigin(0.5);

    if (!active) {
      bg.on('pointerover', () => {
        bg.setFillStyle(0x1a3355, 0.8);
        text.setColor('#aaccee');
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x1a3355, 0.5);
        text.setColor('#667799');
      });
      bg.on('pointerdown', () => {
        this.scene.restart({ tab: label });
      });
    }
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
