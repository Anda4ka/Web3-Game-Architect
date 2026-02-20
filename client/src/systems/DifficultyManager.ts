import {
  BASE_SPEED,
  MAX_SPEED,
  SPEED_INCREMENT,
  SPEED_INTERVAL,
  OBSTACLE_SPAWN_INTERVAL_MIN,
  OBSTACLE_SPAWN_INTERVAL_MAX,
  SLOW_TIME_FACTOR,
} from '../config/gameConfig';

export class DifficultyManager {
  public currentSpeed: number;
  private elapsed: number = 0;
  private startSpeedBonus: number;
  private slowTimeActive: boolean = false;

  constructor(startSpeedLevel: number = 0) {
    this.startSpeedBonus = startSpeedLevel * 50;
    this.currentSpeed = BASE_SPEED + this.startSpeedBonus;
  }

  update(delta: number, isSlowTime: boolean): void {
    this.elapsed += delta;
    this.slowTimeActive = isSlowTime;

    const increments = Math.floor(this.elapsed / SPEED_INTERVAL);
    const rawSpeed = BASE_SPEED + this.startSpeedBonus + increments * SPEED_INCREMENT;
    this.currentSpeed = Math.min(rawSpeed, MAX_SPEED);
  }

  getEffectiveSpeed(): number {
    return this.slowTimeActive
      ? this.currentSpeed * SLOW_TIME_FACTOR
      : this.currentSpeed;
  }

  /** Returns spawn interval in ms — decreases as speed increases */
  getSpawnInterval(): number {
    const ratio = (this.currentSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
    const interval = OBSTACLE_SPAWN_INTERVAL_MAX -
      ratio * (OBSTACLE_SPAWN_INTERVAL_MAX - OBSTACLE_SPAWN_INTERVAL_MIN);
    return Math.max(interval, OBSTACLE_SPAWN_INTERVAL_MIN);
  }

  /** Difficulty level 0–1 for UI / tuning */
  getDifficultyRatio(): number {
    return Math.min((this.currentSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED), 1);
  }

  getElapsed(): number {
    return this.elapsed;
  }

  reset(): void {
    this.elapsed = 0;
    this.currentSpeed = BASE_SPEED + this.startSpeedBonus;
  }
}
