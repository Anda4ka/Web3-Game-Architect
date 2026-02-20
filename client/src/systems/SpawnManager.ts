import Phaser from 'phaser';
import {
  LANE_POSITIONS,
  OBSTACLE_WIDTH,
  OBSTACLE_HEIGHT,
  CRYSTAL_WIDTH,
  CRYSTAL_HEIGHT,
  BOOST_WIDTH,
  BOOST_HEIGHT,
  BOOST_SPAWN_CHANCE,
  CRYSTAL_SPAWN_INTERVAL_MIN,
  CRYSTAL_SPAWN_INTERVAL_MAX,
  ObstacleType,
  BoostType,
} from '../config/gameConfig';
import { DifficultyManager } from './DifficultyManager';

const OBSTACLE_KEYS = Object.values(ObstacleType);
const BOOST_KEYS = Object.values(BoostType);

export class SpawnManager {
  private scene: Phaser.Scene;
  private difficultyManager: DifficultyManager;

  public obstacles!: Phaser.Physics.Arcade.Group;
  public crystals!: Phaser.Physics.Arcade.Group;
  public boosts!: Phaser.Physics.Arcade.Group;

  private obstacleTimer: number = 0;
  private crystalTimer: number = 0;
  private nextObstacleInterval: number = 1500;
  private nextCrystalInterval: number = 1000;

  constructor(scene: Phaser.Scene, difficultyManager: DifficultyManager) {
    this.scene = scene;
    this.difficultyManager = difficultyManager;

    this.obstacles = scene.physics.add.group({ runChildUpdate: false });
    this.crystals = scene.physics.add.group({ runChildUpdate: false });
    this.boosts = scene.physics.add.group({ runChildUpdate: false });

    this.nextObstacleInterval = difficultyManager.getSpawnInterval();
    this.nextCrystalInterval = Phaser.Math.Between(CRYSTAL_SPAWN_INTERVAL_MIN, CRYSTAL_SPAWN_INTERVAL_MAX);
  }

  update(delta: number): void {
    const speed = this.difficultyManager.getEffectiveSpeed();

    // Move all spawned objects downward
    this.moveGroup(this.obstacles, speed, delta);
    this.moveGroup(this.crystals, speed, delta);
    this.moveGroup(this.boosts, speed, delta);

    // Clean off-screen
    this.cleanGroup(this.obstacles);
    this.cleanGroup(this.crystals);
    this.cleanGroup(this.boosts);

    // Spawn timers
    this.obstacleTimer += delta;
    this.crystalTimer += delta;

    if (this.obstacleTimer >= this.nextObstacleInterval) {
      this.obstacleTimer = 0;
      this.nextObstacleInterval = this.difficultyManager.getSpawnInterval();
      this.spawnObstacle();

      // Chance to spawn boost alongside obstacle
      if (Math.random() < BOOST_SPAWN_CHANCE) {
        this.spawnBoost();
      }
    }

    if (this.crystalTimer >= this.nextCrystalInterval) {
      this.crystalTimer = 0;
      this.nextCrystalInterval = Phaser.Math.Between(CRYSTAL_SPAWN_INTERVAL_MIN, CRYSTAL_SPAWN_INTERVAL_MAX);
      this.spawnCrystal();
    }
  }

  private spawnObstacle(): void {
    const lane = Phaser.Math.Between(0, 2);
    const typeKey = Phaser.Utils.Array.GetRandom(OBSTACLE_KEYS) as string;

    const obs = this.scene.physics.add.sprite(
      LANE_POSITIONS[lane],
      -OBSTACLE_HEIGHT,
      typeKey
    );
    obs.setData('type', typeKey);
    obs.setData('lane', lane);
    obs.setDisplaySize(OBSTACLE_WIDTH, OBSTACLE_HEIGHT);

    const body = obs.body as Phaser.Physics.Arcade.Body;
    body.setSize(OBSTACLE_WIDTH - 10, OBSTACLE_HEIGHT - 10);

    this.obstacles.add(obs);
  }

  private spawnCrystal(): void {
    const lane = Phaser.Math.Between(0, 2);

    const crystal = this.scene.physics.add.sprite(
      LANE_POSITIONS[lane],
      -CRYSTAL_HEIGHT,
      'crystal'
    );
    crystal.setData('lane', lane);
    crystal.setDisplaySize(CRYSTAL_WIDTH, CRYSTAL_HEIGHT);

    const body = crystal.body as Phaser.Physics.Arcade.Body;
    body.setSize(CRYSTAL_WIDTH, CRYSTAL_HEIGHT);

    this.crystals.add(crystal);
  }

  private spawnBoost(): void {
    const lane = Phaser.Math.Between(0, 2);
    const typeKey = Phaser.Utils.Array.GetRandom(BOOST_KEYS) as string;

    const boost = this.scene.physics.add.sprite(
      LANE_POSITIONS[lane],
      -BOOST_HEIGHT,
      typeKey
    );
    boost.setData('type', typeKey);
    boost.setData('lane', lane);
    boost.setDisplaySize(BOOST_WIDTH, BOOST_HEIGHT);

    const body = boost.body as Phaser.Physics.Arcade.Body;
    body.setSize(BOOST_WIDTH, BOOST_HEIGHT);

    this.boosts.add(boost);
  }

  private moveGroup(group: Phaser.Physics.Arcade.Group, speed: number, delta: number): void {
    const dy = (speed * delta) / 1000;
    group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      sprite.y += dy;
    });
  }

  private cleanGroup(group: Phaser.Physics.Arcade.Group): void {
    group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > 700) {
        sprite.destroy();
      }
    });
  }

  reset(): void {
    this.obstacles.clear(true, true);
    this.crystals.clear(true, true);
    this.boosts.clear(true, true);
    this.obstacleTimer = 0;
    this.crystalTimer = 0;
  }
}
