import { UPGRADES, UpgradeConfig } from '../config/gameConfig';

export class UpgradeManager {
  static getLevel(key: string): number {
    return parseInt(localStorage.getItem(`frost_upgrade_${key}`) || '0', 10);
  }

  static setLevel(key: string, level: number): void {
    localStorage.setItem(`frost_upgrade_${key}`, level.toString());
  }

  static getCrystals(): number {
    return parseInt(localStorage.getItem('frost_rush_crystals') || '0', 10);
  }

  static setCrystals(amount: number): void {
    localStorage.setItem('frost_rush_crystals', amount.toString());
  }

  static addCrystals(amount: number): void {
    const current = UpgradeManager.getCrystals();
    UpgradeManager.setCrystals(current + amount);
  }

  static canPurchase(key: string): boolean {
    const config = UPGRADES.find((u) => u.key === key);
    if (!config) return false;

    const level = UpgradeManager.getLevel(key);
    if (level >= config.maxLevel) return false;

    const cost = config.costs[level];
    return UpgradeManager.getCrystals() >= cost;
  }

  static purchase(key: string): boolean {
    const config = UPGRADES.find((u) => u.key === key);
    if (!config) return false;

    const level = UpgradeManager.getLevel(key);
    if (level >= config.maxLevel) return false;

    const cost = config.costs[level];
    const crystals = UpgradeManager.getCrystals();
    if (crystals < cost) return false;

    UpgradeManager.setCrystals(crystals - cost);
    UpgradeManager.setLevel(key, level + 1);
    return true;
  }

  static getUpgradeConfig(key: string): UpgradeConfig | undefined {
    return UPGRADES.find((u) => u.key === key);
  }

  static resetAll(): void {
    UPGRADES.forEach((u) => {
      localStorage.removeItem(`frost_upgrade_${u.key}`);
    });
    localStorage.removeItem('frost_rush_crystals');
    localStorage.removeItem('frost_rush_best');
  }
}
