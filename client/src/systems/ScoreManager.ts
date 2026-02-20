import {
  DISTANCE_SCORE_INTERVAL,
  DISTANCE_SCORE_POINTS,
  CRYSTAL_SCORE,
  NEAR_MISS_POINTS,
} from '../config/gameConfig';
import { ComboManager } from './ComboManager';

export class ScoreManager {
  public score: number = 0;
  public crystals: number = 0;
  public distance: number = 0;
  public bestScore: number = 0;

  private distanceAccumulator: number = 0;
  private comboManager: ComboManager;
  private crystalBonusLevel: number = 0;

  constructor(comboManager: ComboManager, crystalBonusLevel: number = 0) {
    this.comboManager = comboManager;
    this.crystalBonusLevel = crystalBonusLevel;
    this.bestScore = parseInt(localStorage.getItem('frost_rush_best') || '0', 10);
  }

  addDistance(pixels: number): void {
    this.distance += pixels;
    this.distanceAccumulator += pixels;

    while (this.distanceAccumulator >= DISTANCE_SCORE_INTERVAL) {
      this.distanceAccumulator -= DISTANCE_SCORE_INTERVAL;
      this.score += DISTANCE_SCORE_POINTS * this.comboManager.getMultiplier();
    }
  }

  collectCrystal(): number {
    const bonus = 1 + this.crystalBonusLevel * 0.1;
    const value = Math.floor(CRYSTAL_SCORE * bonus);
    this.score += value * this.comboManager.getMultiplier();
    this.crystals++;
    this.comboManager.addPickup();
    return value;
  }

  nearMiss(): number {
    const points = NEAR_MISS_POINTS * this.comboManager.getMultiplier();
    this.score += points;
    return points;
  }

  onHit(): void {
    this.comboManager.reset();
  }

  finalize(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('frost_rush_best', this.bestScore.toString());
    }
  }

  reset(): void {
    this.score = 0;
    this.crystals = 0;
    this.distance = 0;
    this.distanceAccumulator = 0;
    this.comboManager.reset();
  }
}
