import Phaser from 'phaser';
import {
  LANE_POSITIONS,
  LANE_SWITCH_DURATION,
  PLAYER_Z,
  PLAYER_SCREEN_Y,
  VP_X,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  JUMP_HEIGHT,
  JUMP_DURATION,
  SLIDE_DURATION,
} from '../config/gameConfig';

/**
 * Behind-the-player (Subway Surfers) perspective Player.
 * Player is at bottom-center of screen, facing AWAY from camera.
 * Lanes are X positions (left / center / right).
 */
export class Player {
  public currentLane: number = 1; // 0=left, 1=center, 2=right
  public isJumping: boolean = false;
  public isSliding: boolean = false;
  public isDead: boolean = false;
  public isMovingLane: boolean = false;

  // Boost state (managed by GameScene, exposed here for convenience)
  public shieldActive: boolean = false;
  public shieldHits: number = 0;

  // Internal
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private shieldGfx: Phaser.GameObjects.Graphics;

  // Lane position (X coordinate)
  private targetX: number;
  private currentX: number;
  private jumpOffset: number = 0; // negative Y offset when jumping
  private jumpTimer: number = 0;
  private slideTimer: number = 0;
  private elapsed: number = 0;

  // Lane tween reference
  private laneTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.targetX = LANE_POSITIONS[1]; // center lane
    this.currentX = this.targetX;

    this.container = scene.add.container(this.currentX, PLAYER_SCREEN_Y).setDepth(200);
    this.bodyGfx = scene.add.graphics();
    this.shieldGfx = scene.add.graphics();
    this.shieldGfx.setVisible(false);
    this.container.add(this.bodyGfx);
    this.container.add(this.shieldGfx);

    this.drawPlayer();
  }

  // ─── Lane Movement (Subway Surfers style) ───────────────────────
  /** Move to left lane (lane index - 1) */
  moveLeft(): void {
    if (this.isDead || this.isMovingLane || this.currentLane <= 0) return;
    this.currentLane--;
    this.animateToLane();
  }

  /** Move to right lane (lane index + 1) */
  moveRight(): void {
    if (this.isDead || this.isMovingLane || this.currentLane >= 2) return;
    this.currentLane++;
    this.animateToLane();
  }

  /** Backward compat aliases */
  laneUp(): void { this.moveLeft(); }
  laneDown(): void { this.moveRight(); }

  private animateToLane(): void {
    this.isMovingLane = true;
    this.targetX = LANE_POSITIONS[this.currentLane];

    // Determine lean direction
    const leanAngle = this.targetX > this.currentX ? 5 : -5; // degrees

    if (this.laneTween) this.laneTween.stop();

    // Lean into the turn
    this.scene.tweens.add({
      targets: this.container,
      angle: leanAngle,
      duration: LANE_SWITCH_DURATION * 0.4,
      yoyo: true,
      ease: 'Sine.easeOut',
    });

    this.laneTween = this.scene.tweens.add({
      targets: this,
      currentX: this.targetX,
      duration: LANE_SWITCH_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.isMovingLane = false;
        this.laneTween = null;
        this.container.setAngle(0); // reset lean
      },
    });
  }

  // ─── Jump ───────────────────────────────────────────────────────
  jump(): void {
    if (this.isDead || this.isJumping || this.isSliding) return;
    this.isJumping = true;
    this.jumpTimer = 0;
  }

  // ─── Slide ──────────────────────────────────────────────────────
  slide(): void {
    if (this.isDead || this.isJumping || this.isSliding) return;
    this.isSliding = true;
    this.slideTimer = SLIDE_DURATION;
  }

  // ─── Update (call every frame) ─────────────────────────────────
  update(dt: number): void {
    if (this.isDead) return;
    this.elapsed += dt;

    // Jump arc
    if (this.isJumping) {
      this.jumpTimer += dt;
      const t = Math.min(this.jumpTimer / JUMP_DURATION, 1);
      this.jumpOffset = -Math.sin(t * Math.PI) * JUMP_HEIGHT;
      if (t >= 1) {
        this.isJumping = false;
        this.jumpOffset = 0;
        this.jumpTimer = 0;
      }
    }

    // Slide timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.slideTimer = 0;
      }
    }

    // Update container position (X = lane, Y = fixed + jump offset)
    this.container.setPosition(this.currentX, PLAYER_SCREEN_Y + this.jumpOffset);

    // Scale effect during jump (slight grow to simulate rising toward camera)
    if (this.isJumping) {
      const t = this.jumpTimer / JUMP_DURATION;
      this.container.setScale(1 + Math.sin(t * Math.PI) * 0.12);
    } else {
      this.container.setScale(1);
    }

    this.drawPlayer();
  }

  // ─── Drawing (seen from BEHIND — back of player visible) ───────
  private drawPlayer(): void {
    const g = this.bodyGfx;
    g.clear();

    const w = PLAYER_WIDTH;
    const h = this.isSliding ? PLAYER_HEIGHT * 0.4 : PLAYER_HEIGHT;

    // Shadow on ground (bigger)
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 5, w + 18, 18);

    if (this.isSliding) {
      // ── Sliding pose (compressed, low to ground) ──
      // Body (flat, wide)
      g.fillStyle(0x00d4ff, 1);
      g.fillRoundedRect(-w / 2 - 4, -h, w + 8, h, 5);

      // Backpack top visible
      g.fillStyle(0x0088aa, 1);
      g.fillRoundedRect(-w / 2 + 2, -h + 2, w - 4, h * 0.5, 3);

      // Hat (flat on top)
      g.fillStyle(0x4a3728, 1);
      g.fillRect(-10, -h - 2, 20, 5);
    } else {
      // ── Standing / Running pose (seen from behind) ──

      // Legs (animated alternately — running, bigger amplitude)
      const legPhase = Math.sin(this.elapsed * 0.015) * 13;
      g.fillStyle(0x0077aa, 1);
      g.fillRoundedRect(-11, -4, 10, 18 + legPhase, 3);  // left leg
      g.fillRoundedRect(2, -4, 10, 18 - legPhase, 3);    // right leg

      // Shoes
      g.fillStyle(0x333333, 1);
      g.fillRoundedRect(-12, 14 + legPhase, 12, 6, 2);  // left shoe
      g.fillRoundedRect(1, 14 - legPhase, 12, 6, 2);    // right shoe

      // Body (jacket / torso — seen from back)
      g.fillStyle(0x00d4ff, 1);
      g.fillRoundedRect(-w / 2, -h, w, h - 8, 6);

      // Backpack
      g.fillStyle(0x0088aa, 1);
      g.fillRoundedRect(-w / 2 + 4, -h + 12, w - 8, h * 0.45, 4);

      // Backpack straps
      g.fillStyle(0x006688, 1);
      g.fillRect(-w / 2 + 3, -h + 5, 4, 20);  // left strap
      g.fillRect(w / 2 - 7, -h + 5, 4, 20);   // right strap

      // Body detail stripe (waist/belt)
      g.fillStyle(0x005577, 1);
      g.fillRect(-w / 2 + 2, -12, w - 4, 5);

      // Head (back of head — no face visible, bigger)
      g.fillStyle(0xffddbb, 0.95);
      g.fillCircle(0, -h + 10, 14);

      // Hair (back of head)
      g.fillStyle(0x4a3728, 1);
      g.fillCircle(0, -h + 8, 14);

      // Hat / beanie (bigger)
      g.fillStyle(0x4a3728, 1);
      g.fillRoundedRect(-13, -h - 4, 26, 14, 5);
      // Hat pom-pom
      g.fillStyle(0xff4466, 1);
      g.fillCircle(0, -h - 5, 5);

      // Ears (peeking from sides)
      g.fillStyle(0xffddbb, 0.8);
      g.fillCircle(-14, -h + 12, 4);
      g.fillCircle(14, -h + 12, 4);

      // Scarf (trailing behind — visible from back, longer)
      g.fillStyle(0xff4466, 1);
      g.fillRect(-9, -h + 22, 18, 6);
      // Scarf tail (flowing, longer)
      const scarfWave = Math.sin(this.elapsed * 0.008) * 4;
      g.fillRect(-4, -h + 28, 10, 14 + scarfWave);
      // Scarf tip
      g.fillStyle(0xdd3355, 1);
      g.fillRect(-3, -h + 42 + scarfWave, 8, 5);

      // Arms (swinging opposite to legs, bigger)
      const armPhase = Math.sin(this.elapsed * 0.015 + Math.PI) * 8;
      g.fillStyle(0x00bbdd, 1);
      g.fillRoundedRect(-w / 2 - 6, -h + 24, 7, 22 + armPhase, 3); // left arm
      g.fillRoundedRect(w / 2 - 1, -h + 24, 7, 22 - armPhase, 3);  // right arm

      // Gloves
      g.fillStyle(0x333333, 1);
      g.fillCircle(-w / 2 - 3, -h + 46 + armPhase, 4); // left glove
      g.fillCircle(w / 2 + 2, -h + 46 - armPhase, 4);  // right glove
    }

    // Shield glow (bigger to match bigger player)
    this.shieldGfx.clear();
    if (this.shieldActive) {
      this.shieldGfx.setVisible(true);
      this.shieldGfx.lineStyle(3, 0xffdd00, 0.7);
      this.shieldGfx.strokeEllipse(0, -h / 2, w + 34, h + 34);
      this.shieldGfx.fillStyle(0xffdd00, 0.08);
      this.shieldGfx.fillEllipse(0, -h / 2, w + 34, h + 34);
    } else {
      this.shieldGfx.setVisible(false);
    }
  }

  // ─── Hitbox for Z-range + lane collision ────────────────────────
  getHitbox(): { lane: number; z: number; jumping: boolean; sliding: boolean } {
    return {
      lane: this.currentLane,
      z: PLAYER_Z,
      jumping: this.isJumping,
      sliding: this.isSliding,
    };
  }

  /** Current visual Y (screen Y + jump offset) */
  getVisualY(): number {
    return PLAYER_SCREEN_Y + this.jumpOffset;
  }

  /** Current lane X position */
  getLaneX(): number {
    return this.currentX;
  }

  /** Backward compat — returns currentX as "lane Y" */
  getLaneY(): number {
    return this.currentX;
  }

  // ─── Hit / Death ───────────────────────────────────────────────
  /** Returns true if shield absorbed the hit */
  absorbHit(): boolean {
    if (this.shieldActive) {
      this.shieldHits--;
      if (this.shieldHits <= 0) {
        this.shieldActive = false;
      }
      // Flash effect
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0.5,
        duration: 80,
        yoyo: true,
        repeat: 2,
      });
      return true;
    }
    return false;
  }

  die(): void {
    this.isDead = true;
    this.bodyGfx.clear();
    this.bodyGfx.fillStyle(0xff0000, 0.8);
    this.bodyGfx.fillRoundedRect(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, 6);
  }

  // ─── Reset ─────────────────────────────────────────────────────
  reset(): void {
    this.currentLane = 1;
    this.targetX = LANE_POSITIONS[1];
    this.currentX = this.targetX;
    this.jumpOffset = 0;
    this.jumpTimer = 0;
    this.slideTimer = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.isDead = false;
    this.isMovingLane = false;
    this.shieldActive = false;
    this.shieldHits = 0;
    this.elapsed = 0;
    if (this.laneTween) {
      this.laneTween.stop();
      this.laneTween = null;
    }
    this.container.setPosition(this.currentX, PLAYER_SCREEN_Y);
    this.container.setScale(1);
    this.container.setAlpha(1);
    this.drawPlayer();
  }

  destroy(): void {
    this.bodyGfx.destroy();
    this.shieldGfx.destroy();
    this.container.destroy();
  }
}
