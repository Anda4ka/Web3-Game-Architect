export interface RunTelemetry {
  timestamp: number;
  event: 'jump' | 'slide' | 'collect' | 'hit';
  data?: any;
}

export interface RunLogs {
  score: number;
  crystals: number;
  durationMs: number;
  telemetry: RunTelemetry[];
}

export class ValidationService {
  // Configurable limits
  private readonly MAX_SCORE_PER_SECOND = 100;
  private readonly MAX_RUN_DURATION_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MIN_CRYSTAL_SCORE_RATIO = 10; // 1 crystal should be roughly 50 points, but let's be flexible

  /**
   * Validates a game run result.
   * @returns true if the run is valid, false otherwise.
   */
  public validateRun(logs: RunLogs): { valid: boolean; reason?: string } {
    const { score, durationMs, crystals, telemetry } = logs;

    // 1. Basic sanity checks
    if (score < 0 || durationMs <= 0 || crystals < 0) {
      return { valid: false, reason: 'Invalid basic stats' };
    }

    // 2. Max duration check
    if (durationMs > this.MAX_RUN_DURATION_MS) {
      return { valid: false, reason: 'Run too long' };
    }

    // 3. Score vs Time check (Anti-speedhack/score-injection)
    const scorePerSecond = (score / durationMs) * 1000;
    if (scorePerSecond > this.MAX_SCORE_PER_SECOND) {
      return { valid: false, reason: 'Score too high for duration' };
    }

    // 4. Telemetry consistency check
    // In a real production app, we would verify the sequence of events.
    // For MVP: Check if number of 'collect' events matches crystals reported.
    const collectEvents = telemetry.filter(t => t.event === 'collect').length;
    if (collectEvents !== crystals) {
        // Allow small margin or just be strict
        if (Math.abs(collectEvents - crystals) > 2) {
            return { valid: false, reason: 'Crystal count mismatch with telemetry' };
        }
    }

    // 5. Check for impossible combos (optional, but good)
    // ...

    return { valid: true };
  }
}

export const validationService = new ValidationService();
