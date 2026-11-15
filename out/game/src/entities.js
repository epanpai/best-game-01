// Ember Drift — the things that live in the drift: the wisp (player), embers
// (pickups), void shards (hazards), power-up stars and the particles they all
// shed. Plain data plus small update helpers; the world owns the rules.

import { EMBER, FIELD, PLAYER, SHARD, STAR } from './config.js';

/** The player's wisp: position, velocity, trail, dash and power-up timers. */
export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    face: 0, // facing angle, for the wisp's eyes and trail
    trail: [],
    dashTime: 0,
    dashCooldown: 0,
    invuln: 0,
    shield: 0,
    magnet: 0,
    slow: 0,
    double: 0,
  };
}

/** A golden ember: drifts down slowly, bobs, and glints. */
export function spawnEmber(random, wave) {
  const speed = 42 + wave * 4 + random.range(0, 20);
  return {
    kind: 'ember',
    x: random.range(30, FIELD.width - 30),
    y: -20,
    vy: speed,
    vx: random.range(-12, 12),
    radius: EMBER.radius,
    phase: random.range(0, Math.PI * 2),
    age: 0,
    active: true,
  };
}

/** A violet void shard: falls faster, spins, and homes a little toward the wisp. */
export function spawnShard(random, wave, speedBase) {
  const fromLeft = random.next() < 0.5;
  return {
    kind: 'shard',
    x: fromLeft ? -20 : FIELD.width + 20,
    y: random.range(40, FIELD.height * 0.55),
    vx: (fromLeft ? 1 : -1) * random.range(0.5, 1) * speedBase,
    vy: random.range(18, 42) + wave * 2,
    radius: SHARD.radius,
    angle: random.range(0, Math.PI * 2),
    spin: random.range(-SHARD.spinSpeed, SHARD.spinSpeed),
    age: 0,
    active: true,
  };
}

/** A rare power-up star: shield, magnet, slow time or double score. */
export function spawnStar(random) {
  return {
    kind: 'star',
    power: random.pick(['shield', 'magnet', 'slow', 'double']),
    x: random.range(40, FIELD.width - 40),
    y: -20,
    vy: 34,
    vx: 0,
    radius: STAR.radius,
    phase: random.range(0, Math.PI * 2),
    age: 0,
    life: STAR.lifeSeconds,
    active: true,
  };
}

/** A fading spark for pickups, hits and dashes. */
export function spawnBurst(particles, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const v = speed * (0.4 + Math.random() * 0.8);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.5 + Math.random() * 0.4,
      age: 0,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

/** The night sky's slow stars: three parallax layers, drawn behind everything. */
export function createStarfield(random, count) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: random.range(0, FIELD.width),
      y: random.range(0, FIELD.height),
      layer: random.pick([0.12, 0.25, 0.45]),
      size: random.range(0.6, 2.1),
      twinkle: random.range(0, Math.PI * 2),
    });
  }
  return stars;
}
