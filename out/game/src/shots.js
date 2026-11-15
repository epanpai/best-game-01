// Ember Drift — the screenshot scenes behind ?shot=start|play|rush|end. Each
// one plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame. The 'end'
// scene starts the last wave one ember short of its quota, so the autopilot
// collects the final ember and the victory screen is a real win, not a pose.

import { FIELD, PLAYER, STEP, WAVE_QUOTA } from './config.js';
import { beginRun, EVENT_OVER, EVENT_WIN, stepWorld, tryDash } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 24;
const RUSH_SECONDS = 55;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Seconds until the wisp, drifting in `direction`, meets a shard; Infinity if never. */
function timeToHit(state, dx, dy, horizon) {
  const p = state.player;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - p.radius, Math.max(p.radius, p.x + dx * PLAYER.maxSpeed * t));
    const y = Math.min(FIELD.height - p.radius, Math.max(p.radius, p.y + dy * PLAYER.maxSpeed * t));
    for (const shard of state.shards) {
      if (!shard.active) continue;
      const sx = shard.x + shard.vx * t;
      const sy = shard.y + shard.vy * t;
      if (Math.hypot(sx - x, sy - y) < shard.radius + p.radius + 6) return t;
    }
  }
  return Infinity;
}

/**
 * Steer toward the nearest ember (or power-up star) while keeping clear of
 * shards: of the eight compass directions, take the one that chases the target
 * and is hit last. Returns a minimal input-shaped object for stepWorld.
 */
function autopilot(state, horizon) {
  const p = state.player;
  let target = null;
  let targetDist = Infinity;
  for (const ember of state.embers) {
    if (!ember.active) continue;
    const d = Math.hypot(ember.x - p.x, ember.y - p.y);
    if (d < targetDist) {
      targetDist = d;
      target = ember;
    }
  }
  for (const star of state.stars) {
    if (!star.active) continue;
    const d = Math.hypot(star.x - p.x, star.y - p.y);
    if (d < targetDist * 0.8) {
      targetDist = d;
      target = star;
    }
  }
  const tx = target ? target.x : FIELD.width / 2;
  const ty = target ? target.y : FIELD.height / 2;
  const wantX = tx > p.x + 10 ? 1 : tx < p.x - 10 ? -1 : 0;
  const wantY = ty > p.y + 10 ? 1 : ty < p.y - 10 ? -1 : 0;
  const dirs = [
    [wantX, wantY],
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  let best = dirs[0];
  let bestTime = timeToHit(state, dirs[0][0], dirs[0][1], horizon);
  for (const dir of dirs) {
    const t = timeToHit(state, dir[0], dir[1], horizon);
    if (t > bestTime) {
      bestTime = t;
      best = dir;
    }
  }
  const nearShard = state.shards.some(
    (shard) => shard.active && Math.hypot(shard.x - p.x, shard.y - p.y) < 90,
  );
  return {
    moveVector: () => ({ x: best[0], y: best[1] }),
    hasKeyMove: () => best[0] !== 0 || best[1] !== 0,
    pointer: { x: p.x, y: p.y, active: false, down: false },
    dash: nearShard && p.dashCooldown <= 0,
  };
}

function runFor(state, seconds, horizon, onStep) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const input = autopilot(state, horizon);
    // The autopilot dashes through danger when a shard closes in.
    if (input.dash) tryDash(state);
    const events = stepWorld(state, STEP, input);
    if (onStep) onStep(events);
    if (events & EVENT_OVER) break;
  }
}

/**
 * Set `state` to the named scene and return the screen to draw over it and
 * the best score to show. The world is stepped with the real rules in every
 * scene, so each screenshot is a frame the game itself produced.
 */
export function stageShot(name, state) {
  beginRun(state);
  if (name !== 'play' && name !== 'rush' && name !== 'end') {
    runFor(state, START_SECONDS, 0.7);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    runFor(state, PLAY_SECONDS, 0.7);
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  if (name === 'rush') {
    // A later, busier wave: play forward longer so shards and combo build up.
    runFor(state, RUSH_SECONDS, 0.55);
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  // 'end': jump to the final wave one ember short of its quota, put one ember
  // beside the wisp, and let the autopilot collect it for a real victory.
  state.wave = 10;
  state.collected = WAVE_QUOTA[9] - 1;
  state.score = 2840;
  state.combo = 5;
  state.embers.length = 0;
  state.shards.length = 0;
  state.embers.push({
    kind: 'ember',
    x: state.player.x + 60,
    y: state.player.y - 40,
    vy: 30,
    vx: 0,
    radius: 10,
    phase: 0,
    age: 0,
    active: true,
  });
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    const events = stepWorld(state, STEP, autopilot(state, 0.7));
    if (events & EVENT_WIN) break;
    if (events & EVENT_OVER) break;
  }
  return { screen: state.won ? SCREEN_WIN : SCREEN_OVER, best: state.score };
}
