// Ember Drift — the game itself: waves, spawning, movement, collisions, combo,
// scoring, lives and the win/lose conditions. Pure logic over plain state; the
// renderer only reads it, and the screenshot autopilot only steers it.

import {
  COMBO_MAX,
  COMBO_WINDOW,
  EMBER,
  FIELD,
  LIVES,
  PLAYER,
  POWER,
  WAVE_CLEAR_BONUS,
  WAVE_EMBER_INTERVAL,
  WAVE_QUOTA,
  WAVE_SHARD_SPEED,
  WAVE_SHARDS,
  WAVES,
} from './config.js';
import { createPlayer, createStarfield, spawnBurst, spawnEmber, spawnShard, spawnStar } from './entities.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WAVE = 8;
export const EVENT_WIN = 16;
export const EVENT_POWER = 32;
export const EVENT_DASH = 64;

/** Fresh state for a new run: wave 1, full lives, an empty sky. */
export function createWorld(random) {
  const state = {
    random,
    player: createPlayer(),
    embers: [],
    shards: [],
    stars: [],
    particles: [],
    starfield: createStarfield(random, 110),
    wave: 1,
    collected: 0, // embers banked toward this wave's quota
    score: 0,
    lives: LIVES,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    time: 0,
    emberTimer: 0.4,
    starTimer: 14,
    waveBanner: 0, // seconds left showing the "Wave N" banner
    shake: 0,
    over: false,
    won: false,
    flash: 0, // red flash on a hit, gold flash on a wave clear
  };
  return state;
}

/** Reset a world in place for a new run (the title screen reuses one world). */
export function resetWorld(state) {
  const fresh = createWorld(state.random);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
  state.waveBanner = 1.6;
}

function quotaOf(state) {
  return WAVE_QUOTA[state.wave - 1];
}

function clampToField(entity, margin) {
  entity.x = Math.max(margin, Math.min(FIELD.width - margin, entity.x));
  entity.y = Math.max(margin, Math.min(FIELD.height - margin, entity.y));
}

function steerPlayer(state, dt, input) {
  const p = state.player;
  // Keyboard steering beats pointer steering when keys are held.
  if (input.hasKeyMove()) {
    const v = input.moveVector();
    const len = Math.hypot(v.x, v.y) || 1;
    p.vx += (v.x / len) * PLAYER.accel * dt;
    p.vy += (v.y / len) * PLAYER.accel * dt;
  } else if (input.pointer.active) {
    // Pointer steering: head straight for the pointer at up to full speed,
    // so the wisp answers the mouse at once instead of trailing behind it.
    const dx = input.pointer.x - p.x;
    const dy = input.pointer.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      const want = Math.min(PLAYER.maxSpeed, dist * 6);
      const tx = (dx / dist) * want;
      const ty = (dy / dist) * want;
      const blend = Math.min(1, dt * 14);
      p.vx += (tx - p.vx) * blend;
      p.vy += (ty - p.vy) * blend;
    }
  }
  // Friction, then clamp to the field.
  const damp = Math.exp(-PLAYER.friction * dt);
  p.vx *= damp;
  p.vy *= damp;
  const speed = Math.hypot(p.vx, p.vy);
  const cap = p.dashTime > 0 ? PLAYER.dashSpeed : PLAYER.maxSpeed;
  if (speed > cap) {
    p.vx = (p.vx / speed) * cap;
    p.vy = (p.vy / speed) * cap;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  clampToField(p, p.radius);
  if (speed > 20) p.face = Math.atan2(p.vy, p.vx);
  // The trail remembers where the wisp has been, for the glowing tail.
  p.trail.unshift({ x: p.x, y: p.y });
  if (p.trail.length > PLAYER.trailLength) p.trail.pop();
  if (p.dashTime > 0) p.dashTime -= dt;
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.shield > 0) p.shield -= dt;
  if (p.magnet > 0) p.magnet -= dt;
  if (p.slow > 0) p.slow -= dt;
  if (p.double > 0) p.double -= dt;
}

/** Dash: a burst of speed plus a blink of invulnerability to slip through shards. */
export function tryDash(state) {
  const p = state.player;
  if (p.dashCooldown > 0 || state.over) return false;
  const speed = Math.hypot(p.vx, p.vy);
  const dir = speed > 30 ? { x: p.vx / speed, y: p.vy / speed } : { x: Math.cos(p.face), y: Math.sin(p.face) };
  p.vx = dir.x * PLAYER.dashSpeed;
  p.vy = dir.y * PLAYER.dashSpeed;
  p.dashTime = PLAYER.dashTime;
  p.dashCooldown = PLAYER.dashCooldown;
  p.invuln = Math.max(p.invuln, 0.35);
  spawnBurst(state.particles, p.x, p.y, '#7df9ff', 10, 160);
  return true;
}

function spawnWaveShards(state) {
  const count = WAVE_SHARDS[state.wave - 1];
  const speed = WAVE_SHARD_SPEED[state.wave - 1];
  for (let i = 0; i < count; i += 1) {
    state.shards.push(spawnShard(state.random, state.wave, speed));
  }
}

function collectEmber(state, ember) {
  ember.active = false;
  state.collected += 1;
  state.combo = Math.min(state.combo + 1, COMBO_MAX);
  state.comboTimer = COMBO_WINDOW;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const mult = state.player.double > 0 ? 2 : 1;
  state.score += EMBER.value * state.combo * mult;
  spawnBurst(state.particles, ember.x, ember.y, '#ffc44d', 12, 190);
  if (state.collected >= quotaOf(state)) return clearWave(state);
  return EVENT_PICKUP;
}

function clearWave(state) {
  state.score += WAVE_CLEAR_BONUS;
  state.flash = 0.5;
  if (state.wave >= WAVES) {
    state.won = true;
    state.over = true;
    return EVENT_WIN;
  }
  state.wave += 1;
  state.collected = 0;
  state.waveBanner = 1.8;
  state.embers.length = 0;
  state.shards.length = 0;
  spawnWaveShards(state);
  return EVENT_WAVE;
}

function applyPower(state, star) {
  const p = state.player;
  if (star.power === 'shield') p.shield = POWER.shieldSeconds;
  if (star.power === 'magnet') p.magnet = POWER.magnetSeconds;
  if (star.power === 'slow') p.slow = POWER.slowSeconds;
  if (star.power === 'double') p.double = POWER.doubleSeconds;
  spawnBurst(state.particles, star.x, star.y, '#8dff9e', 16, 220);
}

function hitPlayer(state) {
  const p = state.player;
  if (p.invuln > 0 || p.shield > 0) return EVENT_NONE;
  state.lives -= 1;
  state.combo = 0;
  state.comboTimer = 0;
  state.shake = 0.45;
  state.flash = 0.6;
  p.invuln = PLAYER.invulnAfterHit;
  spawnBurst(state.particles, p.x, p.y, '#ff5d7a', 22, 260);
  if (state.lives <= 0) {
    state.over = true;
    return EVENT_HIT | EVENT_OVER;
  }
  return EVENT_HIT;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Advance the world one fixed step. `input` steers the wisp; the returned
 * bitmask says what happened (pickup, hit, wave clear, win, game over), so the
 * main loop can play the matching sound and banner.
 */
export function stepWorld(state, dt, input) {
  if (state.over) return EVENT_NONE;
  let events = EVENT_NONE;
  state.time += dt;
  if (state.waveBanner > 0) state.waveBanner -= dt;
  if (state.shake > 0) state.shake -= dt;
  if (state.flash > 0) state.flash -= dt;
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  steerPlayer(state, dt, input);

  // Slow time halves the world's pace, not the player's: the wisp keeps its
  // speed while embers and shards drift. The factor applies below.
  const slowFactor = state.player.slow > 0 ? 0.5 : 1;

  // Spawning: embers fall steadily, stars rarely, shards arrive with the wave.
  state.emberTimer -= dt;
  if (state.emberTimer <= 0) {
    state.embers.push(spawnEmber(state.random, state.wave));
    state.emberTimer = WAVE_EMBER_INTERVAL[state.wave - 1] * state.random.range(0.75, 1.25);
  }
  state.starTimer -= dt;
  if (state.starTimer <= 0) {
    state.stars.push(spawnStar(state.random));
    state.starTimer = state.random.range(13, 20);
  }

  const p = state.player;

  for (const ember of state.embers) {
    if (!ember.active) continue;
    ember.age += dt;
    // The magnet pulls nearby embers toward the wisp.
    if (p.magnet > 0) {
      const d = dist(ember, p);
      if (d < 190 && d > 1) {
        ember.x += ((p.x - ember.x) / d) * 320 * dt;
        ember.y += ((p.y - ember.y) / d) * 320 * dt;
      }
    }
    ember.y += ember.vy * slowFactor * dt;
    ember.x += ember.vx * dt + Math.sin(ember.age * EMBER.bobSpeed + ember.phase) * 14 * dt;
    if (ember.y > FIELD.height + 30) ember.active = false;
    if (dist(ember, p) < ember.radius + p.radius) events |= collectEmber(state, ember);
  }

  for (const shard of state.shards) {
    if (!shard.active) continue;
    shard.age += dt;
    shard.angle += shard.spin * dt * slowFactor;
    // Shards drift across the field and home gently toward the wisp's height.
    shard.x += shard.vx * slowFactor * dt;
    shard.y += shard.vy * slowFactor * dt + Math.sin(shard.age * 0.8) * 12 * dt;
    if (shard.x < -40 || shard.x > FIELD.width + 40 || shard.y > FIELD.height + 40) {
      // A shard that leaves the field comes back on the other side, faster.
      const fresh = spawnShard(state.random, state.wave, WAVE_SHARD_SPEED[state.wave - 1]);
      shard.x = fresh.x;
      shard.y = fresh.y;
      shard.vx = fresh.vx;
      shard.vy = fresh.vy;
    }
    if (dist(shard, p) < shard.radius + p.radius - 4) {
      // A shield (or a real hit) shatters the shard; plain invulnerability
      // lets it pass through, so the post-hit grace period is not free kills.
      const shielded = p.shield > 0;
      const hit = hitPlayer(state);
      events |= hit;
      if (hit & EVENT_OVER) return events;
      if (hit !== EVENT_NONE || shielded) {
        shard.active = false;
        spawnBurst(state.particles, shard.x, shard.y, '#b678ff', 14, 200);
      }
    }
  }

  for (const star of state.stars) {
    if (!star.active) continue;
    star.age += dt;
    star.life -= dt;
    star.y += star.vy * slowFactor * dt;
    if (star.life <= 0 || star.y > FIELD.height + 30) star.active = false;
    if (dist(star, p) < star.radius + p.radius) {
      star.active = false;
      applyPower(state, star);
      events |= EVENT_POWER;
    }
  }

  for (const particle of state.particles) {
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.exp(-2.4 * dt);
    particle.vy *= Math.exp(-2.4 * dt);
  }
  state.particles = state.particles.filter((particle) => particle.age < particle.life);
  state.embers = state.embers.filter((ember) => ember.active);
  state.shards = state.shards.filter((shard) => shard.active);
  state.stars = state.stars.filter((star) => star.active);

  return events;
}

/** Start a wave's shards: called once when a run begins. */
export function beginRun(state) {
  resetWorld(state);
  spawnWaveShards(state);
}
