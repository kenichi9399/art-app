// cfg.js
(() => {
  "use strict";

  const CFG = {
    // Canvas
    DPR_MAX: 2.25,
    BG: "#05070d",

    // Mood / palette
    haze: { r: 240, g: 245, b: 255 },
    ink:  { r:  10, g:  12, b:  22 },

    // Particle system
    N: 2200,
    spawnRing: 0.42,     // 0..1 screen radius where particles prefer to live
    drift: 0.65,
    curl: 0.95,
    noiseScale: 0.00115,

    // Touch
    touchRadius: 170,
    touchForce: 1.25,
    longPressMs: 420,

    // Light layers
    bloomStrength: 0.65,
    veilStrength: 0.85,
    grain: 0.085,

    // Perf
    targetFPS: 60,
    dtClamp: 1 / 20,

    // Save
    saveScale: 2.0
  };

  window.CFG = CFG;
})();
