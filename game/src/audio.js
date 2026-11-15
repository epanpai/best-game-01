// Ember Drift — every sound is synthesized with WebAudio: short oscillator
// blips and filtered noise, no audio files, nothing fetched. The context is
// created lazily on the first user gesture (browsers demand that), and every
// call is a no-op while muted or before that gesture, so screenshot runs stay
// silent and never throw.

const NOTE = { c5: 523.25, d5: 587.33, e5: 659.25, g5: 783.99, a5: 880, c6: 1046.5, e6: 1318.5, g6: 1568 };

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Call from any real user gesture so later sounds are allowed to play. */
  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    if (muted || !ensure() || context.state !== 'running') return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + seconds);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  function noise(seconds, volume, when = 0, lowpass = 1200) {
    if (muted || !ensure() || context.state !== 'running') return;
    const start = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** Pickup blip: the pitch climbs with the combo, so a hot streak sings. */
    pickup(combo) {
      const step = Math.min(combo, 8);
      const base = 620 * Math.pow(1.059, step);
      tone(base, 0.12, 'sine', 0.5, 0, base * 1.5);
      tone(base * 2, 0.08, 'triangle', 0.18);
    },
    /** A shard hit: low thud plus a short noise burst. */
    hit() {
      tone(160, 0.25, 'sawtooth', 0.4, 0, 55);
      noise(0.18, 0.35, 0, 900);
    },
    dash() {
      noise(0.16, 0.22, 0, 3200);
      tone(300, 0.14, 'sine', 0.18, 0, 720);
    },
    powerup() {
      tone(NOTE.c5, 0.1, 'triangle', 0.35);
      tone(NOTE.e5, 0.1, 'triangle', 0.35, 0.08);
      tone(NOTE.g5, 0.16, 'triangle', 0.35, 0.16);
    },
    /** Wave cleared: a quick rising arpeggio. */
    waveClear() {
      [NOTE.c5, NOTE.e5, NOTE.g5, NOTE.c6].forEach((freq, i) => tone(freq, 0.16, 'triangle', 0.35, i * 0.09));
    },
    /** Victory: a longer fanfare; defeat: two falling notes. */
    victory() {
      [NOTE.c5, NOTE.e5, NOTE.g5, NOTE.c6, NOTE.e6, NOTE.g6].forEach((freq, i) =>
        tone(freq, 0.22, 'triangle', 0.35, i * 0.11),
      );
    },
    defeat() {
      tone(NOTE.a5, 0.3, 'sawtooth', 0.25, 0, 440);
      tone(NOTE.e5, 0.55, 'sawtooth', 0.25, 0.28, 220);
    },
    click() {
      tone(880, 0.06, 'sine', 0.3);
    },
  };
}
