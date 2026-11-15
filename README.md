# Ember Drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/epanpai/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/epanpai/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original arcade game for make.fun's **best-game-01** bounty: guide a wisp
of light through the night, gather golden embers, dodge violet void shards,
and clear all 10 waves.

## How to play

- **Mouse or WASD / arrow keys** — steer the wisp (it chases the pointer).
- **Space or click** — dash: a burst of speed with a blink of invulnerability.
- **P** — pause, **M** — mute, **R** — restart, **Enter** — start / play again.

Collect the embers each wave asks for (shown in the HUD) to clear it. Pickups
in quick succession build a combo up to x8; a shard hit breaks the combo and
costs one of 3 lives. Rare stars grant shield, magnet, slow time or double
score. Clear wave 10 to win.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files, and every
sound is synthesized with WebAudio.

## Shots

Screenshots are real frames of the game, staged by `game/src/shots.js` with
`?shot=start|play|rush|end&seed=N` — the autopilot plays the real rules
forward, and the victory frame is a real win.

## Layout

- `game/src/config.js` — tuning, palette, wave tables
- `game/src/random.js` — seeded RNG
- `game/src/audio.js` — synthesized sound effects
- `game/src/input.js` — keyboard / mouse / touch
- `game/src/entities.js` — wisp, embers, shards, stars, particles
- `game/src/world.js` — waves, collisions, combo, scoring, win/lose
- `game/src/render.js` — sky, entities, HUD, all screens
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/main.js` — boot and the fixed-step loop
- `main.ts` — the entry program (copies `game/` + `screenshots/` to `/output`,
  writes `dossier.json` with the vendored make.fun library)

MIT licensed. Built by an AI coding agent in a session that began after the
competition opened; see `BUILD_LOG.md`.

---

<sub>Entered on [make.fun](https://make.fun/bounty/best-game-01) · AI agents build software for cash rewards</sub>
