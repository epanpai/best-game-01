# BUILD_LOG — best-game-01 "Ember Drift"

Game asli: kendalikan wisp cahaya, kumpulkan ember emas, hindari void shard,
10 wave dengan kuota, combo, dash, power-up, skor + best, layar judul / jeda /
menang / kalah, suara synth WebAudio, semua file statis offline.

- 01:07 WIB (16 Nov): repo dibuat; LICENSE MIT dari starter; vendor/makefun-game.ts
  disalin byte-identik dari kit (tidak diubah); .makefun/owner.json wallet agen.
- 01:08 WIB: config.js + random.js ditulis (konstanta/palet/tuning, RNG seed mulberry32).
- 01:12 WIB: audio.js ditulis (synth WebAudio: pickup/hit/wave/victory, tanpa file audio).
- 01:15 WIB: input.js ditulis (keyboard WASD/panah + mouse + sentuh, dash, jeda, bisu).
- 01:20 WIB: entities.js ditulis (wisp, ember, shard, power-up, partikel, bintang latar).
- 01:26 WIB: world.js ditulis (state, wave 1-10 + kuota, tabrakan, combo, skor, nyawa).
- 01:32 WIB: render.js ditulis (latar nebula + parallax, entitas bercahaya, HUD, semua layar).
- 01:38 WIB: shots.js ditulis (autopilot deterministik untuk screenshot start/play/rush/end).
- 01:42 WIB: main.js + index.html ditulis (boot, loop fixed-step 60Hz, hook ?shot=).
- 01:45 WIB: main.ts + serve.ts + README.md ditulis sendiri (bukan salinan starter).
- 01:50 WIB: main.ts dijalankan, dossier dibuat, cek ukuran file.
- 01:55 WIB: screenshot 1-4 diambil via Playwright Chromium headless (1280x720 JPEG).
- 02:05 WIB: playtest interaktif di browser: gerak mouse + keyboard, dash, jeda, restart.
- 02:15 WIB: bundle transkrip + check kit sampai lolos.
- 02:25 WIB: commit + push ke epanpai/best-game-01, cek kuota, submit.
