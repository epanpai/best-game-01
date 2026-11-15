// Ember Drift — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between five screens:
// title, play, paused, game over and victory.
//
// ?seed=N fixes the drift's random pattern. ?shot=start|play|rush|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM,
  ACTION_DASH,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  createInput,
} from './input.js';
import { beginRun, createWorld, EVENT_HIT, EVENT_OVER, EVENT_PICKUP, EVENT_POWER, EVENT_WAVE, EVENT_WIN, stepWorld, tryDash } from './world.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
// Exposed for playtests and screenshots: the live world, nothing else.
window.__game = { world, seed };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    beginRun(world);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. Wave 1: collect ${6} embers.`);
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.score > best) {
      best = world.score;
      saveBest(best);
    }
    if (won) audio.victory();
    else audio.defeat();
    announce(won ? `Victory! Score ${world.score}. Best ${best}.` : `Game over. Score ${world.score}. Best ${best}.`);
  }

  function frame(now) {
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.consumeActions();

    if (actions.has(ACTION_MUTE)) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }

    if (screen === SCREEN_TITLE) {
      if (actions.has(ACTION_CONFIRM)) {
        audio.click();
        startGame();
      }
      // The title screen drifts gently behind its panel.
      world.time += elapsed;
      renderer.draw(world, screen, best);
    } else if (screen === SCREEN_PLAY) {
      if (actions.has(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        if (actions.has(ACTION_DASH) && tryDash(world)) audio.dash();
        accumulator += elapsed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const events = stepWorld(world, STEP, input);
          if (events & EVENT_PICKUP) audio.pickup(world.combo);
          if (events & EVENT_POWER) audio.powerup();
          if (events & EVENT_HIT) audio.hit();
          if (events & EVENT_WAVE) {
            audio.waveClear();
            announce(`Wave ${world.wave}.`);
          }
          if (events & EVENT_OVER) {
            endGame(Boolean(events & EVENT_WIN));
            break;
          }
        }
        renderer.draw(world, screen, best);
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions.has(ACTION_PAUSE) || actions.has(ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        last = performance.now();
        announce('Playing.');
      }
      renderer.draw(world, screen, best);
    } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions.has(ACTION_RESTART) || actions.has(ACTION_CONFIRM)) {
        audio.click();
        startGame();
      }
      world.time += elapsed;
      renderer.draw(world, screen, best);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
