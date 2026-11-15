// Ember Drift — tuning, palette and field constants. One place for every number
// the designers (and the playtests) care about, so balance changes stay boring.

// Logical playfield. The canvas scales to the window; the game always thinks in
// these units, so a screenshot and a desktop window show the same game.
export const FIELD = { width: 960, height: 600 };

// How the world ticks: fixed 60 Hz steps, so a slow frame never changes the game.
export const STEP = 1 / 60;
export const BEST_KEY = 'ember-drift-best';

// The player is a little wisp of light. It steers toward the pointer when the
// mouse moves, or with WASD / arrow keys; Space (or click) dashes.
export const PLAYER = {
  radius: 15,
  accel: 2600,
  maxSpeed: 340,
  friction: 5.2,
  dashSpeed: 780,
  dashTime: 0.16,
  dashCooldown: 1.4,
  invulnAfterHit: 1.6,
  trailLength: 14,
};

// Pickups and hazards. Embers are the goal; shards cost a life; stars are rare
// power-ups (shield, magnet, slow time, double score) that keep runs interesting.
export const EMBER = { radius: 10, value: 10, bobAmp: 3, bobSpeed: 2.4 };
export const SHARD = { radius: 13, spinSpeed: 2.2 };
export const STAR = { radius: 13, lifeSeconds: 9 };

// Ten waves, then the drift is won. Each wave asks for more embers while the
// shards get faster and more numerous; the last wave is a sprint, not a slog.
export const WAVES = 10;
export const WAVE_QUOTA = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
export const WAVE_SHARDS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const WAVE_SHARD_SPEED = [70, 80, 90, 100, 112, 124, 136, 148, 160, 175];
export const WAVE_EMBER_INTERVAL = [0.95, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45];
export const WAVE_CLEAR_BONUS = 150;
export const LIVES = 3;

// Combo: pickups inside the window keep the multiplier climbing, up to x8.
// A hit breaks the chain, so greedy play is a real choice.
export const COMBO_WINDOW = 2.5;
export const COMBO_MAX = 8;

// Power-up durations, in seconds.
export const POWER = {
  shieldSeconds: 6,
  magnetSeconds: 8,
  slowSeconds: 5,
  doubleSeconds: 10,
};

// The palette: deep indigo night, warm gold embers, violet danger, cyan dash.
export const PALETTE = {
  skyTop: '#0b1030',
  skyMid: '#171238',
  skyBottom: '#241040',
  nebulaA: 'rgba(88, 60, 180, 0.20)',
  nebulaB: 'rgba(20, 140, 160, 0.14)',
  nebulaC: 'rgba(200, 90, 140, 0.10)',
  star: '#cdd8ff',
  ember: '#ffc44d',
  emberCore: '#fff3c4',
  shard: '#b678ff',
  shardCore: '#e8ccff',
  shardEye: '#ff5d8f',
  player: '#7df9ff',
  playerCore: '#ffffff',
  starPower: '#8dff9e',
  hudText: '#eaf2ff',
  hudDim: '#9fb0d8',
  danger: '#ff5d7a',
  gold: '#ffd76a',
};
