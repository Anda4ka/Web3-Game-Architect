const fs = require('fs');
const p = 'frost-rush/client/src/scenes/GameScene.ts';
const W = (s) => fs.appendFileSync(p, s);
fs.writeFileSync(p, '');

W(`import Phaser from 'phaser';
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
`);
console.log('part1 ok');
