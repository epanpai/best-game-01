// Ember Drift — keyboard, mouse and touch input in one place. The wisp steers
// toward the pointer (mouse or touch drag) and with WASD / arrow keys; Space or
// a click dashes; P or Escape pauses; M mutes; Enter / R starts and restarts.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';
export const ACTION_DASH = 'dash';

/**
 * Reads the pointer and keys every frame. `pressed` fires once per key press
 * (edge-triggered actions like dash and pause); `held` is the live key state.
 * The canvas is scaled to the window, so pointer coordinates are mapped back
 * into logical field units here, once.
 */
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const pointer = { x: FIELD.width / 2, y: FIELD.height / 2, active: false, down: false };

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  function onKeyDown(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(key);
    keys.add(key);
  }

  function onKeyUp(event) {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }

  function onPointerMove(event) {
    const pos = toField(event);
    pointer.x = pos.x;
    pointer.y = pos.y;
    pointer.active = true;
  }

  function onPointerDown(event) {
    const pos = toField(event);
    pointer.x = pos.x;
    pointer.y = pos.y;
    pointer.active = true;
    pointer.down = true;
    pressed.add('pointer');
  }

  function onPointerUp() {
    pointer.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function held(key) {
    return keys.has(key);
  }

  return {
    pointer,
    /** -1, 0 or 1 on each axis from the held movement keys. */
    moveVector() {
      const x = (held('d') || held('ArrowRight') ? 1 : 0) - (held('a') || held('ArrowLeft') ? 1 : 0);
      const y = (held('s') || held('ArrowDown') ? 1 : 0) - (held('w') || held('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    /** True while any movement key is held. */
    hasKeyMove() {
      return this.moveVector().x !== 0 || this.moveVector().y !== 0;
    },
    /** Edge-triggered actions pressed since the last frame; call once a frame. */
    consumeActions() {
      const actions = new Set();
      if (pressed.has('Enter') || pressed.has(' ')) actions.add(ACTION_CONFIRM);
      if (pressed.has('p') || pressed.has('P') || pressed.has('Escape')) actions.add(ACTION_PAUSE);
      if (pressed.has('m') || pressed.has('M')) actions.add(ACTION_MUTE);
      if (pressed.has('r') || pressed.has('R')) actions.add(ACTION_RESTART);
      if (pressed.has(' ') || pressed.has('pointer')) actions.add(ACTION_DASH);
      pressed.clear();
      return actions;
    },
  };
}
