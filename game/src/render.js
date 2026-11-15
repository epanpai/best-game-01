// Ember Drift — everything the player sees: the night sky, the glowing drift,
// the HUD and every screen (title, pause, victory, game over). The renderer
// only reads world state, never changes it, so screenshots are honest frames.

import { COMBO_MAX, COMBO_WINDOW, FIELD, PALETTE, WAVE_QUOTA, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const POWER_LABEL = { shield: 'SHIELD', magnet: 'MAGNET', slow: 'SLOW', double: '2X SCORE' };
const POWER_COLOR = { shield: '#8dff9e', magnet: '#7df9ff', slow: '#c9a7ff', double: '#ffd76a' };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const scale = { x: 1, y: 1 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    scale.x = canvas.width / FIELD.width;
    scale.y = canvas.height / FIELD.height;
  }

  function glowCircle(x, y, radius, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = radius * 1.6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSky(state) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(0.55, PALETTE.skyMid);
    grad.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Three slow nebula blobs, drifting with time.
    const t = state.time * 0.05;
    const blobs = [
      { x: 200 + Math.sin(t) * 30, y: 150, r: 190, c: PALETTE.nebulaA },
      { x: 760 + Math.cos(t * 0.7) * 40, y: 420, r: 220, c: PALETTE.nebulaB },
      { x: 480 + Math.sin(t * 0.5 + 2) * 50, y: 90, r: 150, c: PALETTE.nebulaC },
    ];
    for (const blob of blobs) {
      const g = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      g.addColorStop(0, blob.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(blob.x - blob.r, blob.y - blob.r, blob.r * 2, blob.r * 2);
    }
    // Parallax stars, twinkling gently.
    for (const star of state.starfield) {
      const tw = 0.45 + 0.4 * Math.sin(state.time * 1.6 + star.twinkle);
      const y = (star.y + state.time * 6 * star.layer) % FIELD.height;
      ctx.globalAlpha = tw * (0.5 + star.layer);
      ctx.fillStyle = PALETTE.star;
      ctx.fillRect(star.x, y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawEmber(ember) {
    const bob = Math.sin(ember.age * 2.4 + ember.phase) * 3;
    const y = ember.y + bob;
    glowCircle(ember.x, y, ember.radius, PALETTE.ember, 0.85);
    ctx.fillStyle = PALETTE.emberCore;
    ctx.beginPath();
    ctx.arc(ember.x, y, ember.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShard(shard) {
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.angle);
    ctx.shadowColor = PALETTE.shard;
    ctx.shadowBlur = 16;
    ctx.fillStyle = PALETTE.shard;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? shard.radius + 5 : shard.radius - 3;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.shardEye;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStar(star) {
    const pulse = 1 + Math.sin(star.age * 5) * 0.12;
    glowCircle(star.x, star.y, star.radius * pulse, POWER_COLOR[star.power], 0.9);
    ctx.fillStyle = '#0b1030';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = { shield: 'S', magnet: 'M', slow: 'T', double: '2' }[star.power];
    ctx.fillText(glyph, star.x, star.y + 0.5);
  }

  function drawPlayer(state) {
    const p = state.player;
    // The tail: fading circles along the wisp's recent path.
    for (let i = p.trail.length - 1; i >= 1; i -= 1) {
      const spot = p.trail[i];
      const fade = (1 - i / p.trail.length) * 0.5;
      ctx.globalAlpha = fade;
      ctx.fillStyle = PALETTE.player;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, p.radius * (0.9 - (i / p.trail.length) * 0.55), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Blink while invulnerable after a hit, so the grace period reads clearly.
    if (p.invuln > 0 && Math.floor(state.time * 12) % 2 === 0) return;
    if (p.shield > 0) {
      ctx.save();
      ctx.strokeStyle = POWER_COLOR.shield;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(state.time * 6);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    glowCircle(p.x, p.y, p.radius, PALETTE.player, 0.95);
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // Two eyes, looking where the wisp is headed.
    const ex = Math.cos(p.face) * 4;
    const ey = Math.sin(p.face) * 4;
    ctx.fillStyle = '#0b1030';
    ctx.beginPath();
    ctx.arc(p.x + ex - 3, p.y + ey - 3, 2.2, 0, Math.PI * 2);
    ctx.arc(p.x + ex + 3, p.y + ey + 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      const left = 1 - particle.age / particle.life;
      ctx.globalAlpha = Math.max(0, left);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * left + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function heart(x, y, size, filled) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 16, size / 16);
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-9, -3, -6, -11, 0, -5);
    ctx.bezierCurveTo(6, -11, 9, -3, 0, 5);
    ctx.closePath();
    ctx.fillStyle = filled ? PALETTE.danger : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.restore();
  }

  function drawHud(state, best) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Score, big and left; best beneath it.
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(state.score).padStart(6, '0'), 20, 44);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 22, 64);
    // Wave and quota, centred: "WAVE 3/10" and the ember pips.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`WAVE ${state.wave}/${WAVES}`, FIELD.width / 2, 36);
    const quota = WAVE_QUOTA[state.wave - 1];
    const pips = Math.min(state.collected, quota);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`◆ ${pips}/${quota} embers`, FIELD.width / 2, 60);
    // Lives as hearts, right.
    for (let i = 0; i < 3; i += 1) heart(FIELD.width - 32 - i * 30, 32, 15, i < state.lives);
    // Combo meter under the score when a streak is alive.
    if (state.combo >= 2) {
      const w = 150;
      const frac = Math.max(0, state.comboTimer / COMBO_WINDOW);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(20, 74, w, 8);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(20, 74, w * frac, 8);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`COMBO x${Math.min(state.combo, COMBO_MAX)}`, 20, 102);
    }
    // Active power-ups with their remaining seconds, bottom-left.
    const actives = [];
    if (state.player.shield > 0) actives.push(['shield', state.player.shield]);
    if (state.player.magnet > 0) actives.push(['magnet', state.player.magnet]);
    if (state.player.slow > 0) actives.push(['slow', state.player.slow]);
    if (state.player.double > 0) actives.push(['double', state.player.double]);
    actives.forEach(([power, left], i) => {
      ctx.fillStyle = POWER_COLOR[power];
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${POWER_LABEL[power]} ${Math.ceil(left)}s`, 20, FIELD.height - 18 - i * 20);
    });
    // Dash cooldown as a small arc under the wisp's trail is too subtle; put a
    // labelled bar bottom-right instead, so the player can plan the next dash.
    const dashFrac = state.player.dashCooldown > 0 ? 1 - state.player.dashCooldown / 1.4 : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(FIELD.width - 170, FIELD.height - 30, 150, 8);
    ctx.fillStyle = dashFrac >= 1 ? PALETTE.player : PALETTE.hudDim;
    ctx.fillRect(FIELD.width - 170, FIELD.height - 30, 150 * dashFrac, 8);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dashFrac >= 1 ? 'DASH READY  [SPACE]' : 'DASH…', FIELD.width - 20, FIELD.height - 38);
    ctx.restore();
  }

  function banner(text, sub, color) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.fillText(text, FIELD.width / 2, FIELD.height / 2 - 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(sub, FIELD.width / 2, FIELD.height / 2 + 26);
    ctx.restore();
  }

  function overlayPanel() {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 26, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
  }

  function drawTitle(state, best) {
    overlayPanel();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.shadowColor = PALETTE.ember;
    ctx.shadowBlur = 30;
    ctx.fillText('EMBER DRIFT', FIELD.width / 2, 168);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Guide your wisp through the night. Gather the embers,', FIELD.width / 2, 214);
    ctx.fillText('dodge the void shards, clear all 10 waves.', FIELD.width / 2, 242);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('MOUSE or WASD / ARROWS — steer      SPACE / CLICK — dash', FIELD.width / 2, 296);
    ctx.fillText('P — pause      M — mute      R — restart', FIELD.width / 2, 322);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 22px system-ui, sans-serif';
    const blink = 0.65 + 0.35 * Math.sin(state.time * 3.5);
    ctx.globalAlpha = blink;
    ctx.fillText('PRESS ENTER OR CLICK TO PLAY', FIELD.width / 2, 392);
    ctx.globalAlpha = 1;
    if (best > 0) {
      ctx.fillStyle = PALETTE.hudDim;
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(`BEST SCORE  ${best}`, FIELD.width / 2, 432);
    }
    ctx.restore();
  }

  function drawPaused() {
    overlayPanel();
    banner('PAUSED', 'Press P to keep drifting', PALETTE.hudText);
  }

  function drawOver(state, best) {
    overlayPanel();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.shadowColor = PALETTE.danger;
    ctx.shadowBlur = 24;
    ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 190);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`SCORE  ${state.score}`, FIELD.width / 2, 258);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(`Wave ${state.wave} of ${WAVES}  •  Best combo x${state.bestCombo}  •  Best score ${Math.max(best, state.score)}`, FIELD.width / 2, 296);
    const blink = 0.65 + 0.35 * Math.sin(state.time * 3.5);
    ctx.globalAlpha = blink;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('PRESS R OR ENTER TO DRIFT AGAIN', FIELD.width / 2, 360);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawWin(state, best) {
    overlayPanel();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.shadowColor = PALETTE.ember;
    ctx.shadowBlur = 30;
    ctx.fillText('THE DRIFT IS YOURS!', FIELD.width / 2, 178);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('All 10 waves cleared — every ember gathered, every shard outrun.', FIELD.width / 2, 224);
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText(`SCORE  ${state.score}`, FIELD.width / 2, 282);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(`Best combo x${state.bestCombo}  •  Best score ${Math.max(best, state.score)}`, FIELD.width / 2, 320);
    const blink = 0.65 + 0.35 * Math.sin(state.time * 3.5);
    ctx.globalAlpha = blink;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('PRESS R OR ENTER TO PLAY AGAIN', FIELD.width / 2, 384);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Paint one frame: the world, the HUD and whichever screen is showing. */
  function draw(state, screen, best) {
    resize();
    ctx.setTransform(scale.x, 0, 0, scale.y, 0, 0);
    // Screen shake on a hit: a small random offset that fades with the timer.
    if (state.shake > 0) {
      const mag = state.shake * 14;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    drawSky(state);
    for (const ember of state.embers) drawEmber(ember);
    for (const star of state.stars) drawStar(star);
    for (const shard of state.shards) drawShard(shard);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawPlayer(state);
    drawParticles(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    // A red wash on a hit, a gold wash on a wave clear.
    if (state.flash > 0) {
      ctx.fillStyle = state.won ? `rgba(255, 196, 77, ${state.flash * 0.25})` : `rgba(255, 93, 122, ${state.flash * 0.3})`;
      ctx.fillRect(-20, -20, FIELD.width + 40, FIELD.height + 40);
    }
    if (screen === SCREEN_PLAY && state.waveBanner > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.waveBanner);
      banner(`WAVE ${state.wave}`, `Collect ${WAVE_QUOTA[state.wave - 1]} embers — shards are coming`, PALETTE.hudText);
      ctx.restore();
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_OVER) drawOver(state, best);
    if (screen === SCREEN_WIN) drawWin(state, best);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw, resize };
}
