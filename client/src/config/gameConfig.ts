// ─── Game Tuning Constants ───────────────────────────────────────────

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// ─── Perspective ──────────────────────────────────────────────────
export const VP_X = GAME_WIDTH / 2;   // vanishing point X (center)
export const VP_Y = 160;              // vanishing point Y (horizon line) — was 180, more room for track
export const TRACK_TOP_W = 90;        // track width at horizon — was 80
export const TRACK_BOT_W = 750;       // track width at bottom of screen — was 600, fills more screen

// ─── Lanes (X-axis positions, calculated at PLAYER_Z depth) ──────
export const LANE_COUNT = 3;
export const PLAYER_Z = 0.82;         // Z-depth where player sits — was 0.85, more space ahead

// Lane X positions at player depth (calculated):
// halfW at PLAYER_Z = TRACK_TOP_W/2 + PLAYER_Z * (TRACK_BOT_W - TRACK_TOP_W)/2
//                   = 45 + 0.82 * 330 = 45 + 270.6 = 315.6
// laneOffset = (lane-1) * 315.6 * 0.55 = (lane-1) * 173.6
// So: lane0 = 400 - 174 = 226, lane1 = 400, lane2 = 400 + 174 = 574
export const LANE_POSITIONS = [226, 400, 574]; // backward compat for ShopScene etc.
export const LANE_Y_POSITIONS = LANE_POSITIONS; // alias

export const LANE_SWITCH_DURATION = 100; // ms — fast snap between lanes

// ─── Player ──────────────────────────────────────────────────────
// Player screen position (at PLAYER_Z depth)
export const PLAYER_SCREEN_Y = VP_Y + PLAYER_Z * (GAME_HEIGHT - VP_Y);  // ~521
export const PLAYER_X = VP_X; // default center lane X (backward compat)
export const PLAYER_Y = PLAYER_SCREEN_Y;
export const PLAYER_WIDTH = 48;       // was 40 — bigger player
export const PLAYER_HEIGHT = 78;      // was 65 — bigger player
export const JUMP_HEIGHT = 140;
export const JUMP_DURATION = 400;
export const SLIDE_DURATION = 450;

// ─── Object Z-depth ─────────────────────────────────────────────
export const SPAWN_Z = 0.0;           // objects spawn at horizon
export const DESPAWN_Z = 1.15;        // objects despawn past player
export const COLLISION_Z = PLAYER_Z;  // collision check zone
export const COLLISION_Z_RANGE = 0.07; // ± range for collision — was 0.06, slightly wider

// ─── Spawn / Despawn (deprecated aliases for backward compat) ────
export const SPAWN_X = 820;
export const DESPAWN_X = -80;

// ─── Speed / Difficulty ──────────────────────────────────────────
export const BASE_SPEED = 0.3;        // Z-units per second (NOT pixels)
export const MAX_SPEED = 0.9;
export const SPEED_INCREMENT = 0.03;
export const SPEED_INTERVAL = 8000;   // ms (8 seconds between speed ups)
export const GRACE_PERIOD = 3500;     // ms — no obstacles for first 3.5s

// ─── Obstacles ───────────────────────────────────────────────────
export const OBSTACLE_SPAWN_INTERVAL_MIN = 1200;  // ms (min gap at max speed)
export const OBSTACLE_SPAWN_INTERVAL_MAX = 2800;  // ms (gap at start)
export const OBSTACLE_WIDTH = 60;
export const OBSTACLE_HEIGHT = 60;

export enum ObstacleType {
  ICE_SPIKE = 'ice_spike',
  BROKEN_BRIDGE = 'broken_bridge',
  FALLING_ICICLE = 'falling_icicle',
  SLIDING_BLOCK = 'sliding_block',
  ICE_PIT = 'ice_pit',
}

// ─── Crystals ────────────────────────────────────────────────────
export const CRYSTAL_ROW_COUNT = 4;          // crystals per spawn event
export const CRYSTAL_SPACING = 0.05;         // Z-depth between crystals in a row
export const CRYSTAL_SPAWN_INTERVAL = 1800;  // ms between crystal rows
export const CRYSTAL_SPAWN_INTERVAL_MIN = 500;   // kept for compat
export const CRYSTAL_SPAWN_INTERVAL_MAX = 1200;  // kept for compat
export const CRYSTAL_WIDTH = 20;
export const CRYSTAL_HEIGHT = 20;
export const CRYSTAL_SCORE = 50;

// ─── Boosts ──────────────────────────────────────────────────────
export const BOOST_SPAWN_CHANCE = 0.08; // 8% chance per spawn cycle
export const BOOST_WIDTH = 40;
export const BOOST_HEIGHT = 40;

export enum BoostType {
  SHIELD = 'shield',
  MAGNET = 'magnet',
  SLOW_TIME = 'slow_time',
}

export const BOOST_DURATIONS: Record<BoostType, number> = {
  [BoostType.SHIELD]: Infinity,  // until hit
  [BoostType.MAGNET]: 5000,     // 5s
  [BoostType.SLOW_TIME]: 3000,  // 3s
};

export const SLOW_TIME_FACTOR = 0.5;
export const MAGNET_RADIUS = 200; // px (used as Z-range in perspective mode)

// ─── Scoring ─────────────────────────────────────────────────────
export const DISTANCE_SCORE_INTERVAL = 0.1; // every 0.1 Z-units
export const DISTANCE_SCORE_POINTS = 10;
export const NEAR_MISS_DISTANCE = 30; // px (deprecated — using Z-range now)
export const NEAR_MISS_POINTS = 25;

export const COMBO_THRESHOLDS = [0, 5, 15, 30]; // pickups to reach x1, x2, x3, x5
export const COMBO_MULTIPLIERS = [1, 2, 3, 5];

// ─── Upgrades ────────────────────────────────────────────────────
export interface UpgradeConfig {
  key: string;
  name: string;
  maxLevel: number;
  costs: number[];
  description: string;
}

export const UPGRADES: UpgradeConfig[] = [
  {
    key: 'magnet_radius',
    name: 'Magnet Radius',
    maxLevel: 5,
    costs: [15, 40, 80, 160, 320],
    description: '+20% magnet pull radius',
  },
  {
    key: 'shield_duration',
    name: 'Shield Strength',
    maxLevel: 3,
    costs: [25, 60, 120],
    description: '+1 extra hit absorbed',
  },
  {
    key: 'start_speed',
    name: 'Head Start',
    maxLevel: 3,
    costs: [20, 50, 100],
    description: 'Begin each run faster',
  },
  {
    key: 'crystal_bonus',
    name: 'Crystal Bonus',
    maxLevel: 5,
    costs: [15, 40, 80, 160, 320],
    description: '+10% crystal value',
  },
];

// ─── Colors (placeholder art) ────────────────────────────────────────
export const COLORS = {
  background: 0x0a0e27,
  ground: 0x1a2a4a,
  player: 0x00d4ff,
  ice_spike: 0xaaddff,
  broken_bridge: 0x8b6914,
  falling_icicle: 0xc8e6ff,
  sliding_block: 0x6688aa,
  ice_pit: 0x001133,
  crystal: 0x00ffcc,
  shield: 0xffdd00,
  magnet: 0xff44aa,
  slow_time: 0x8844ff,
  lane_line: 0x1a3355,
  hud_text: 0xffffff,
  combo_text: 0x00ffcc,
};
