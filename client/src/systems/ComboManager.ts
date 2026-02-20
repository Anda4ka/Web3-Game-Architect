import { COMBO_THRESHOLDS, COMBO_MULTIPLIERS } from '../config/gameConfig';

export class ComboManager {
  public pickupCount: number = 0;
  public comboLevel: number = 0;

  addPickup(): void {
    this.pickupCount++;
    this.updateLevel();
  }

  reset(): void {
    this.pickupCount = 0;
    this.comboLevel = 0;
  }

  getMultiplier(): number {
    return COMBO_MULTIPLIERS[this.comboLevel] || 1;
  }

  getLevel(): number {
    return this.comboLevel;
  }

  private updateLevel(): void {
    for (let i = COMBO_THRESHOLDS.length - 1; i >= 0; i--) {
      if (this.pickupCount >= COMBO_THRESHOLDS[i]) {
        this.comboLevel = i;
        return;
      }
    }
  }
}
