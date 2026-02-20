import Phaser from 'phaser';
import {
  GAME_WIDTH as GW, GAME_HEIGHT as GH, VP_X, VP_Y, TRACK_TOP_W, TRACK_BOT_W,
  PLAYER_Z, PLAYER_SCREEN_Y, SPAWN_Z, DESPAWN_Z, COLLISION_Z_RANGE,
  BASE_SPEED, MAX_SPEED, SPEED_INCREMENT, SPEED_INTERVAL, GRACE_PERIOD,
  OBSTACLE_SPAWN_INTERVAL_MIN, OBSTACLE_SPAWN_INTERVAL_MAX,
  CRYSTAL_ROW_COUNT, CRYSTAL_SPACING, CRYSTAL_SPAWN_INTERVAL, CRYSTAL_SCORE,
  BOOST_SPAWN_CHANCE, ObstacleType, BoostType, BOOST_DURATIONS, SLOW_TIME_FACTOR,
  MAGNET_RADIUS, DISTANCE_SCORE_INTERVAL, DISTANCE_SCORE_POINTS, NEAR_MISS_POINTS,
  COMBO_THRESHOLDS, COMBO_MULTIPLIERS,
} from '../config/gameConfig';
import { Player } from '../objects/Player';
import { sfxCrystal, sfxBoost, sfxShieldBlock, sfxDeath, sfxJump, sfxSlide, sfxCombo, sfxNearMiss } from '../systems/SoundManager';

const OT = Object.values(ObstacleType);
const BT = Object.values(BoostType);
const JS = new Set<string>([ObstacleType.ICE_SPIKE, ObstacleType.BROKEN_BRIDGE, ObstacleType.ICE_PIT, ObstacleType.SLIDING_BLOCK]);
interface OE { gfx: Phaser.GameObjects.Graphics; lbl: Phaser.GameObjects.Text; z: number; ln: number; t: string; p: boolean }
interface CE { gfx: Phaser.GameObjects.Graphics; z: number; ln: number; a: boolean }
interface BE { gfx: Phaser.GameObjects.Graphics; z: number; ln: number; t: string; a: boolean }
interface SE { gfx: Phaser.GameObjects.Graphics; z: number; side: number; tp: number }

function w2s(lane: number, z: number): { x: number; y: number; s: number } {
  const t = Math.max(0, Math.min(z, 1.2));
  const y = VP_Y + t * (GH - VP_Y);
  const hw = (TRACK_TOP_W / 2) + t * ((TRACK_BOT_W - TRACK_TOP_W) / 2);
  const lo = (lane - 1) * hw * 0.55;
  return { x: VP_X + lo, y, s: 0.15 + t * 0.85 };
}

export class GameScene extends Phaser.Scene {
  private pl!: Player;
  private obs: OE[] = []; private cry: CE[] = []; private bst: BE[] = []; private sEn: SE[] = [];
  private dead = false; private pau = false; private hp = 3; private sc = 0; private cr = 0;
  private dist = 0; private dA = 0; private cP = 0; private cL = 0; private best = 0;
  private runStart = 0; private shOn = false; private shH = 0;
  private mgOn = false; private mgT = 0; private slOn = false; private slT = 0;
  private spd = BASE_SPEED; private el = 0; private spdB = 0;
  private oTm = 0; private cTm = 0; private sETm = 0;
  private tG!: Phaser.GameObjects.Graphics; private mG!: Phaser.GameObjects.Graphics; private mO = 0;
  private sT!: Phaser.GameObjects.Text; private coT!: Phaser.GameObjects.Text;
  private crT!: Phaser.GameObjects.Text; private bsT!: Phaser.GameObjects.Text;
  private hpT!: Phaser.GameObjects.Text; private pOv!: Phaser.GameObjects.Container;
  private tsx = 0; private tsy = 0;
  private telemetry: any[] = [];
  constructor() { super({ key: 'GameScene' }); }

  create(): void {
    this.resetAll();
    this.telemetry = [];
    this.runStart = Date.now();
    this.best = +(localStorage.getItem('frost_rush_best') || '0');
    this.spdB = this.upgLvl('start_speed') * 0.05;
    this.spd = BASE_SPEED + this.spdB;
    this.makeBg();
    this.tG = this.add.graphics().setDepth(0);
    for (let z = 0.1; z < 1.0; z += 0.15) this.spawnSideEnv(z);
    this.pl = new Player(this);
    this.makeHUD();
    this.makePause();
    this.setupInput();
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const rd = this.add.text(GW / 2, GH / 2 - 30, 'GET READY!', { fontSize: '36px', fontFamily: 'Arial Black', color: '#00d4ff', stroke: '#001133', strokeThickness: 4 }).setOrigin(0.5).setDepth(300);
    this.tweens.add({ targets: rd, alpha: 0, y: GH / 2 - 80, duration: 2000, ease: 'Power2', onComplete: () => rd.destroy() });
  }

  update(_t: number, dt: number): void {
    if (this.dead || this.pau) return;
    this.el += dt;
    const inc = Math.floor(this.el / SPEED_INTERVAL);
    this.spd = Math.min(BASE_SPEED + this.spdB + inc * SPEED_INCREMENT, MAX_SPEED);
    const sf = this.slOn ? SLOW_TIME_FACTOR : 1;
    const eff = this.spd * sf;
    const dz = (eff * dt) / 1000;
    this.dist += dz; this.dA += dz;
    while (this.dA >= DISTANCE_SCORE_INTERVAL) { this.dA -= DISTANCE_SCORE_INTERVAL; this.sc += DISTANCE_SCORE_POINTS * this.comboMul(); }
    if (this.mgOn) { this.mgT -= dt; if (this.mgT <= 0) this.mgOn = false; }
    if (this.slOn) { this.slT -= dt; if (this.slT <= 0) this.slOn = false; }
    if (this.el > GRACE_PERIOD) {
      const sr = (this.spd - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
      const si = OBSTACLE_SPAWN_INTERVAL_MAX - sr * (OBSTACLE_SPAWN_INTERVAL_MAX - OBSTACLE_SPAWN_INTERVAL_MIN);
      this.oTm += dt;
      if (this.oTm >= si) { this.oTm = 0; this.spawnObs(); if (Math.random() < BOOST_SPAWN_CHANCE) this.spawnBoost(); }
    }
    this.cTm += dt;
    if (this.cTm >= CRYSTAL_SPAWN_INTERVAL) { this.cTm = 0; this.spawnCrystals(); }
    this.sETm += dz;
    if (this.sETm >= 0.15) { this.sETm = 0; this.spawnSideEnv(SPAWN_Z); }
    this.moveEntities(dz); this.checkCollisions();
    if (this.mgOn) this.doMagnet(dt);
    this.pl.update(dt);
    this.mO = (this.mO + dz * 15) % GW;
    this.drawMountains(this.mO); this.drawTrack(); this.drawSideEnv();
    this.drawObstacles(); this.drawCrystals(); this.drawBoosts(); this.updateHUD();
  }

  /* ── PLACEHOLDER METHODS (filled in next edits) ── */
  private resetAll(): void { this.dead=false;this.pau=false;this.hp=3;this.sc=0;this.cr=0;this.dist=0;this.dA=0;this.cP=0;this.cL=0;this.shOn=false;this.shH=0;this.mgOn=false;this.mgT=0;this.slOn=false;this.slT=0;this.spd=BASE_SPEED;this.el=0;this.oTm=0;this.cTm=0;this.sETm=0;this.obs=[];this.cry=[];this.bst=[];this.sEn=[]; }
  private upgLvl(k: string): number { try { const u=JSON.parse(localStorage.getItem('frost_rush_upgrades')||'{}'); return u[k]||0; } catch { return 0; } }
  private comboMul(): number { for(let i=COMBO_THRESHOLDS.length-1;i>=0;i--){if(this.cP>=COMBO_THRESHOLDS[i])return COMBO_MULTIPLIERS[i];} return 1; }
  private makeBg(): void { const sky=this.add.graphics().setDepth(-10);sky.fillGradientStyle(0x0a0e27,0x0a0e27,0x1a3366,0x1a3366,1);sky.fillRect(0,0,GW,VP_Y);const st=this.add.graphics().setDepth(-9);st.fillStyle(0xffffff,0.6);for(let i=0;i<40;i++)st.fillCircle(Math.random()*GW,Math.random()*VP_Y,Math.random()*1.5+0.5);this.mG=this.add.graphics().setDepth(-8);this.drawMountains(0); }
  private drawMountains(o: number): void { const g=this.mG;g.clear();g.fillStyle(0x0d1a33,1);for(let c=0;c<2;c++){const bx=-o+c*GW;g.beginPath();g.moveTo(bx,VP_Y);g.lineTo(bx+80,VP_Y-60);g.lineTo(bx+160,VP_Y-30);g.lineTo(bx+250,VP_Y-80);g.lineTo(bx+350,VP_Y-40);g.lineTo(bx+450,VP_Y-90);g.lineTo(bx+550,VP_Y-50);g.lineTo(bx+650,VP_Y-70);g.lineTo(bx+750,VP_Y-35);g.lineTo(bx+GW,VP_Y-55);g.lineTo(bx+GW,VP_Y);g.closePath();g.fillPath();} }
  private drawTrack(): void {
    const g = this.tG; g.clear();
    g.fillStyle(0x0a1525, 1); g.fillRect(0, VP_Y, GW, GH - VP_Y);
    g.fillStyle(0x1a2a4a, 1); g.beginPath();
    g.moveTo(VP_X - TRACK_TOP_W / 2, VP_Y); g.lineTo(VP_X + TRACK_TOP_W / 2, VP_Y);
    g.lineTo(VP_X + TRACK_BOT_W / 2, GH); g.lineTo(VP_X - TRACK_BOT_W / 2, GH);
    g.closePath(); g.fillPath();
    g.lineStyle(2, 0x3366aa, 0.35);
    for (let z = 0.08; z < 1.05; z += 0.04) {
      const z2 = z + 0.018;
      let p1 = w2s(0.5, z), p2 = w2s(0.5, z2); g.lineBetween(p1.x, p1.y, p2.x, p2.y);
      p1 = w2s(1.5, z); p2 = w2s(1.5, z2); g.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }
    g.lineStyle(2, 0x00d4ff, 0.5);
    g.lineBetween(VP_X - TRACK_TOP_W / 2, VP_Y, VP_X - TRACK_BOT_W / 2, GH);
    g.lineBetween(VP_X + TRACK_TOP_W / 2, VP_Y, VP_X + TRACK_BOT_W / 2, GH);
    const lc = 14, so = (this.dist * 4) % 1;
    for (let i = 0; i < lc; i++) {
      const z = ((i / lc) + so) % 1, p = w2s(1, z);
      const hw = (TRACK_TOP_W / 2) + z * ((TRACK_BOT_W - TRACK_TOP_W) / 2);
      g.lineStyle(1, 0x4488cc, 0.1 * z); g.lineBetween(VP_X - hw + 2, p.y, VP_X + hw - 2, p.y);
    }
    g.fillStyle(0x0f1d35, 0.6);
    g.beginPath(); g.moveTo(VP_X - TRACK_TOP_W / 2 - 5, VP_Y); g.lineTo(VP_X - TRACK_TOP_W / 2, VP_Y);
    g.lineTo(VP_X - TRACK_BOT_W / 2, GH); g.lineTo(VP_X - TRACK_BOT_W / 2 - 30, GH); g.closePath(); g.fillPath();
    g.beginPath(); g.moveTo(VP_X + TRACK_TOP_W / 2 + 5, VP_Y); g.lineTo(VP_X + TRACK_TOP_W / 2, VP_Y);
    g.lineTo(VP_X + TRACK_BOT_W / 2, GH); g.lineTo(VP_X + TRACK_BOT_W / 2 + 30, GH); g.closePath(); g.fillPath();
  }

  private spawnSideEnv(z: number): void {
    const tp = Phaser.Math.Between(0, 3);
    for (let side = 0; side < 2; side++) this.sEn.push({ gfx: this.add.graphics().setDepth(5), z, side, tp });
  }

  private drawSideEnv(): void {
    for (const e of this.sEn) {
      if (e.z < -0.05 || e.z > DESPAWN_Z) continue;
      const { y, s } = w2s(1, e.z);
      const hw = (TRACK_TOP_W / 2) + Math.max(0, Math.min(e.z, 1.2)) * ((TRACK_BOT_W - TRACK_TOP_W) / 2);
      const ex = e.side === 0 ? VP_X - hw - 20 * s : VP_X + hw + 20 * s;
      const g = e.gfx; g.clear(); g.setDepth(Math.floor(Math.max(0, e.z) * 100) + 3);
      if (e.tp === 0) {
        const pw = 22 * s, ph = 110 * s;
        g.fillStyle(0x334466, 1); g.fillRect(ex - pw / 2, y - ph, pw, ph);
        g.fillStyle(0x88bbdd, 0.3); g.fillRect(ex - pw / 2 + 2, y - ph + 5, pw * 0.3, ph - 10);
        g.fillStyle(0xccddee, 0.5); g.fillRect(ex - pw / 2 - 2, y - ph - 3, pw + 4, 6);
      } else if (e.tp === 1) {
        const ww = 45 * s, wh = 55 * s;
        g.fillStyle(0x2a3a5a, 1); g.fillRoundedRect(ex - ww / 2, y - wh, ww, wh, 4 * s);
        g.fillStyle(0xccddee, 0.35); g.fillRect(ex - ww / 2, y - wh, ww, 8 * s);
      } else if (e.tp === 2) {
        const sw = 55 * s, sh = 35 * s;
        g.fillStyle(0x8899aa, 0.7); g.fillEllipse(ex, y - sh / 2, sw, sh);
        g.fillStyle(0xccddee, 0.4); g.fillEllipse(ex, y - sh / 2 - 3 * s, sw * 0.8, sh * 0.5);
      } else {
        const tw = 8 * s, th = 90 * s;
        g.fillStyle(0x553322, 1); g.fillRect(ex - tw / 2, y - th * 0.4, tw, th * 0.4);
        g.fillStyle(0x1a4433, 1);
        g.fillTriangle(ex, y - th, ex + 22 * s, y - th * 0.4, ex - 22 * s, y - th * 0.4);
        g.fillTriangle(ex, y - th * 0.8, ex + 27 * s, y - th * 0.25, ex - 27 * s, y - th * 0.25);
        g.fillStyle(0xccddee, 0.5);
        g.fillTriangle(ex, y - th, ex + 14 * s, y - th * 0.7, ex - 14 * s, y - th * 0.7);
      }
    }
  }
  private spawnObs(): void {
    const ln = Phaser.Math.Between(0, 2);
    const t = Phaser.Utils.Array.GetRandom(OT) as string;
    const gfx = this.add.graphics().setDepth(10);
    const lt = JS.has(t) ? 'JUMP' : 'SLIDE';
    const lc2 = JS.has(t) ? '#ff4444' : '#ffaa00';
    const lbl = this.add.text(0, 0, lt, { fontSize: '16px', fontFamily: 'Arial Black', color: lc2, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(150).setAlpha(0);
    this.obs.push({ gfx, lbl, z: SPAWN_Z, ln, t, p: false });
  }

  private spawnCrystals(): void {
    const ln = Phaser.Math.Between(0, 2);
    for (let i = 0; i < CRYSTAL_ROW_COUNT; i++) {
      this.cry.push({ gfx: this.add.graphics().setDepth(10), z: SPAWN_Z - i * CRYSTAL_SPACING, ln, a: true });
    }
  }

  private spawnBoost(): void {
    const ln = Phaser.Math.Between(0, 2);
    const t = Phaser.Utils.Array.GetRandom(BT) as string;
    this.bst.push({ gfx: this.add.graphics().setDepth(10), z: SPAWN_Z, ln, t, a: true });
  }

  private moveEntities(dz: number): void {
    for (let i = this.obs.length - 1; i >= 0; i--) {
      this.obs[i].z += dz;
      if (this.obs[i].z > DESPAWN_Z) { this.obs[i].gfx.destroy(); this.obs[i].lbl.destroy(); this.obs.splice(i, 1); }
    }
    for (let i = this.cry.length - 1; i >= 0; i--) {
      if (!this.cry[i].a) { this.cry[i].gfx.destroy(); this.cry.splice(i, 1); continue; }
      this.cry[i].z += dz;
      if (this.cry[i].z > DESPAWN_Z) { this.cry[i].gfx.destroy(); this.cry.splice(i, 1); }
    }
    for (let i = this.bst.length - 1; i >= 0; i--) {
      if (!this.bst[i].a) { this.bst[i].gfx.destroy(); this.bst.splice(i, 1); continue; }
      this.bst[i].z += dz;
      if (this.bst[i].z > DESPAWN_Z) { this.bst[i].gfx.destroy(); this.bst.splice(i, 1); }
    }
    for (let i = this.sEn.length - 1; i >= 0; i--) {
      this.sEn[i].z += dz;
      if (this.sEn[i].z > DESPAWN_Z) { this.sEn[i].gfx.destroy(); this.sEn.splice(i, 1); }
    }
  }

  private drawObstacles(): void {
    for (const o of this.obs) {
      if (o.z < -0.05 || o.z > DESPAWN_Z) continue;
      const { x, y, s } = w2s(o.ln, o.z);
      const g = o.gfx; g.clear(); g.setDepth(Math.floor(o.z * 100) + 10);
      g.fillStyle(0x000000, 0.25 * s); g.fillEllipse(x, y + 2, 60 * s, 12 * s);
      if (o.t === ObstacleType.ICE_SPIKE) {
        const w = 60 * s, h = 100 * s;
        g.fillStyle(0x88ccff, 1); g.fillTriangle(x, y - h, x + w * 0.5, y, x - w * 0.5, y);
        g.fillStyle(0xcceeff, 0.5); g.fillTriangle(x, y - h * 0.7, x + w * 0.2, y, x - w * 0.2, y);
        g.fillStyle(0xccddee, 0.6); g.fillEllipse(x, y, w * 0.7, 8 * s);
      } else if (o.t === ObstacleType.BROKEN_BRIDGE) {
        const w = 85 * s, h = 40 * s;
        g.fillStyle(0xaa7722, 1); g.fillRect(x - w * 0.55, y - h, w * 0.35, h); g.fillRect(x + w * 0.2, y - h, w * 0.35, h);
        g.fillStyle(0x000033, 0.9); g.fillRect(x - w * 0.2, y - h, w * 0.4, h);
      } else if (o.t === ObstacleType.FALLING_ICICLE) {
        const w = 50 * s, h = 70 * s;
        g.fillStyle(0x556688, 1); g.fillRect(x - w * 0.6, y - 50 * s, w * 1.2, 6 * s);
        g.fillStyle(0xaaddff, 1); g.fillTriangle(x, y - 50 * s + h * 0.9, x + w * 0.3, y - 50 * s + 6 * s, x - w * 0.3, y - 50 * s + 6 * s);
      } else if (o.t === ObstacleType.SLIDING_BLOCK) {
        const w = 95 * s, h = 65 * s;
        g.fillStyle(0x5588bb, 1); g.fillRoundedRect(x - w * 0.45, y - h * 0.65, w * 0.9, h * 0.65, 5 * s);
        g.lineStyle(2 * s, 0xaaddff, 0.6); g.strokeRoundedRect(x - w * 0.45, y - h * 0.65, w * 0.9, h * 0.65, 5 * s);
      } else if (o.t === ObstacleType.ICE_PIT) {
        const w = 120 * s, h = 35 * s;
        g.fillStyle(0x001133, 1); g.fillEllipse(x, y - h * 0.3, w, h);
        g.lineStyle(2 * s, 0x3366aa, 0.6); g.strokeEllipse(x, y - h * 0.3, w, h);
      }
      if (o.lbl && o.z > 0.3) {
        o.lbl.setPosition(x, y - 80 * s - 14 * s);
        o.lbl.setAlpha(Math.min(1, (o.z - 0.3) * 3));
        o.lbl.setScale(Math.max(s, 0.6));
        o.lbl.setDepth(Math.floor(o.z * 100) + 11);
      }
    }
  }
  private drawCrystals(): void {
    for (const c of this.cry) {
      if (!c.a || c.z < -0.05 || c.z > DESPAWN_Z) continue;
      const { x, y, s } = w2s(c.ln, c.z);
      const g = c.gfx; g.clear(); g.setDepth(Math.floor(c.z * 100) + 8);
      const sz = 14 * s;
      const bob = Math.sin(this.el * 0.006 + c.z * 10) * 4 * s;
      g.fillStyle(0x00d4ff, 0.15); g.fillCircle(x, y - sz + bob, sz * 1.8);
      g.fillStyle(0x00eeff, 1);
      g.fillTriangle(x, y - sz * 2 + bob, x + sz, y + bob, x - sz, y + bob);
      g.fillTriangle(x, y + sz * 0.5 + bob, x + sz, y - sz + bob, x - sz, y - sz + bob);
      g.fillStyle(0xffffff, 0.6);
      g.fillTriangle(x - 2, y - sz * 1.5 + bob, x + sz * 0.4, y - sz * 0.3 + bob, x - sz * 0.5, y - sz * 0.3 + bob);
    }
  }

  private drawBoosts(): void {
    for (const b of this.bst) {
      if (!b.a || b.z < -0.05 || b.z > DESPAWN_Z) continue;
      const { x, y, s } = w2s(b.ln, b.z);
      const g = b.gfx; g.clear(); g.setDepth(Math.floor(b.z * 100) + 9);
      const sz = 18 * s;
      const bob = Math.sin(this.el * 0.005 + b.z * 8) * 3 * s;
      g.fillStyle(0xffdd00, 0.12); g.fillCircle(x, y - sz + bob, sz * 2);
      if (b.t === BoostType.SHIELD) {
        g.fillStyle(0xffdd00, 1); g.fillCircle(x, y - sz + bob, sz);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(x - sz * 0.2, y - sz * 1.2 + bob, sz * 0.3);
      } else if (b.t === BoostType.MAGNET) {
        g.fillStyle(0xff4466, 1); g.fillRoundedRect(x - sz, y - sz * 2 + bob, sz * 2, sz * 2, sz * 0.3);
        g.fillStyle(0xffffff, 0.6); g.fillRect(x - sz * 0.2, y - sz * 1.5 + bob, sz * 0.4, sz);
      } else if (b.t === BoostType.SLOW_TIME) {
        g.fillStyle(0x44aaff, 1); g.fillCircle(x, y - sz + bob, sz);
        g.lineStyle(2 * s, 0xffffff, 0.8); g.strokeCircle(x, y - sz + bob, sz);
        g.lineBetween(x, y - sz + bob, x, y - sz * 1.6 + bob);
        g.lineBetween(x, y - sz + bob, x + sz * 0.5, y - sz * 0.7 + bob);
      }
    }
  }

  private checkCollisions(): void {
    const pLn = this.pl.currentLane;
    const pJ = this.pl.isJumping;
    const pS = this.pl.isSliding;
    for (const o of this.obs) {
      if (Math.abs(o.z - PLAYER_Z) > COLLISION_Z_RANGE) {
        if (!o.p && o.z > PLAYER_Z + COLLISION_Z_RANGE) {
          o.p = true;
          if (o.ln === pLn) { this.cP++; this.sc += NEAR_MISS_POINTS * this.comboMul(); sfxNearMiss(); this.showFloating('+' + NEAR_MISS_POINTS + ' NEAR MISS', 0xffdd00); }
        }
        continue;
      }
      if (o.ln !== pLn) continue;
      if (pJ && JS.has(o.t)) continue;
      if (pS && o.t === ObstacleType.FALLING_ICICLE) continue;
      this.handleHit(o);
    }
    for (const c of this.cry) {
      if (!c.a) continue;
      if (Math.abs(c.z - PLAYER_Z) > COLLISION_Z_RANGE + 0.03) continue;
      if (c.ln !== pLn && !(this.mgOn && Math.abs(c.ln - pLn) <= 1)) continue;
      c.a = false;
      this.cr++; this.cP++; this.sc += CRYSTAL_SCORE * this.comboMul(); sfxCrystal();
      this.telemetry.push({ timestamp: Date.now(), event: 'collect' });
    }
    for (const b of this.bst) {
      if (!b.a) continue;
      if (Math.abs(b.z - PLAYER_Z) > COLLISION_Z_RANGE + 0.02) continue;
      if (b.ln !== pLn) continue;
      b.a = false;
      this.activateBoost(b.t); sfxBoost();
    }
  }

  private doMagnet(dt: number): void {
    const pLn = this.pl.currentLane;
    for (const c of this.cry) {
      if (!c.a) continue;
      const dz = Math.abs(c.z - PLAYER_Z);
      if (dz < 0.3) {
        c.ln += (pLn - c.ln) * 0.15;
        c.z += (PLAYER_Z - c.z) * 0.1;
      }
    }
  }
  private handleHit(o: OE): void {
    if (this.pl.shieldActive) { this.pl.absorbHit(); sfxShieldBlock(); this.showFloating('SHIELD!', 0xffdd00); return; }
    this.hp--; this.cP = 0; this.cL = 0;
    this.telemetry.push({ timestamp: Date.now(), event: 'hit' });
    this.cameras.main.shake(200, 0.01);
    this.showFloating('HIT! HP:' + this.hp, 0xff4444);
    if (this.hp <= 0) { this.gameOver(); }
  }

  private activateBoost(t: string): void {
    if (t === BoostType.SHIELD) { this.pl.shieldActive = true; this.pl.shieldHits = 1 + this.upgLvl('shield_hits'); this.showFloating('SHIELD!', 0xffdd00); }
    else if (t === BoostType.MAGNET) { this.mgOn = true; this.mgT = BOOST_DURATIONS[BoostType.MAGNET]; this.showFloating('MAGNET!', 0xff4466); }
    else if (t === BoostType.SLOW_TIME) { this.slOn = true; this.slT = BOOST_DURATIONS[BoostType.SLOW_TIME]; this.showFloating('SLOW TIME!', 0x44aaff); }
  }

  private showFloating(txt: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(GW / 2, GH / 2 - 60, txt, { fontSize: '22px', fontFamily: 'Arial Black', color: hex, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(300);
    this.tweens.add({ targets: t, alpha: 0, y: GH / 2 - 120, duration: 1200, ease: 'Power2', onComplete: () => t.destroy() });
  }

  private gameOver(): void {
    this.dead = true; this.pl.die(); sfxDeath();
    if (this.sc > this.best) { this.best = this.sc; localStorage.setItem('frost_rush_best', String(this.sc)); }
    this.cameras.main.shake(400, 0.02);
    this.time.delayedCall(800, () => {
      this.scene.start('GameOverScene', { 
        score: this.sc, 
        crystals: this.cr, 
        best: this.best, 
        distance: Math.floor(this.dist * 100),
        maxCombo: this.cP, // simple max combo for now
        duration: Math.floor(this.el),
        telemetry: this.telemetry
      });
    });
  }

  private makeHUD(): void {
    const ts = { fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#001133', strokeThickness: 3 };
    this.sT = this.add.text(15, 12, 'Score: 0', ts).setDepth(250);
    this.crT = this.add.text(15, 36, 'Crystals: 0', { ...ts, fontSize: '15px', color: '#00eeff' }).setDepth(250);
    this.hpT = this.add.text(GW - 15, 12, 'HP: 3', { ...ts, color: '#ff6666' }).setOrigin(1, 0).setDepth(250);
    this.coT = this.add.text(GW - 15, 36, '', { ...ts, fontSize: '14px', color: '#ffdd00' }).setOrigin(1, 0).setDepth(250);
    this.bsT = this.add.text(GW / 2, 12, '', { ...ts, fontSize: '14px', color: '#44aaff' }).setOrigin(0.5, 0).setDepth(250);
  }

  private makePause(): void {
    const bg = this.add.graphics().setDepth(400); bg.fillStyle(0x000000, 0.7); bg.fillRect(0, 0, GW, GH); bg.setVisible(false);
    const txt = this.add.text(GW / 2, GH / 2 - 20, 'PAUSED', { fontSize: '40px', fontFamily: 'Arial Black', color: '#00d4ff', stroke: '#001133', strokeThickness: 4 }).setOrigin(0.5).setDepth(401).setVisible(false);
    const sub = this.add.text(GW / 2, GH / 2 + 30, 'Press P to resume', { fontSize: '16px', fontFamily: 'Arial', color: '#aabbcc' }).setOrigin(0.5).setDepth(401).setVisible(false);
    this.pOv = this.add.container(0, 0, [bg, txt, sub]).setDepth(400).setVisible(false);
  }

  private togglePause(): void {
    this.pau = !this.pau;
    this.pOv.setVisible(this.pau);
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;
    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => { if (!this.pau) { this.pl.moveLeft(); } });
    kb.on('keydown-A', () => { if (!this.pau) { this.pl.moveLeft(); } });
    kb.on('keydown-RIGHT', () => { if (!this.pau) { this.pl.moveRight(); } });
    kb.on('keydown-D', () => { if (!this.pau) { this.pl.moveRight(); } });
    kb.on('keydown-UP', () => { if (!this.pau) { this.pl.jump(); sfxJump(); this.telemetry.push({ timestamp: Date.now(), event: 'jump' }); } });
    kb.on('keydown-W', () => { if (!this.pau) { this.pl.jump(); sfxJump(); this.telemetry.push({ timestamp: Date.now(), event: 'jump' }); } });
    kb.on('keydown-SPACE', () => { if (!this.pau) { this.pl.jump(); sfxJump(); this.telemetry.push({ timestamp: Date.now(), event: 'jump' }); } });
    kb.on('keydown-DOWN', () => { if (!this.pau) { this.pl.slide(); sfxSlide(); this.telemetry.push({ timestamp: Date.now(), event: 'slide' }); } });
    kb.on('keydown-S', () => { if (!this.pau) { this.pl.slide(); sfxSlide(); this.telemetry.push({ timestamp: Date.now(), event: 'slide' }); } });
    kb.on('keydown-P', () => { this.togglePause(); });
    kb.on('keydown-ESC', () => { this.togglePause(); });
    // Touch / swipe
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.tsx = p.x; this.tsy = p.y; });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.pau) return;
      const dx = p.x - this.tsx, dy = p.y - this.tsy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) { if (dx < 0) this.pl.moveLeft(); else this.pl.moveRight(); }
      else { 
        if (dy < 0) { this.pl.jump(); sfxJump(); this.telemetry.push({ timestamp: Date.now(), event: 'jump' }); } 
        else { this.pl.slide(); sfxSlide(); this.telemetry.push({ timestamp: Date.now(), event: 'slide' }); } 
      }
    });
  }

  private updateHUD(): void {
    this.sT.setText('Score: ' + Math.floor(this.sc));
    this.crT.setText('Crystals: ' + this.cr);
    this.hpT.setText('HP: ' + this.hp);
    const cm = this.comboMul();
    this.coT.setText(cm > 1 ? 'x' + cm + ' COMBO' : '');
    const parts: string[] = [];
    if (this.shOn) parts.push('SHIELD');
    if (this.mgOn) parts.push('MAGNET ' + Math.ceil(this.mgT / 1000) + 's');
    if (this.slOn) parts.push('SLOW ' + Math.ceil(this.slT / 1000) + 's');
    this.bsT.setText(parts.join(' | '));
  }
}
