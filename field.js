// field.js
(() => {
  "use strict";

  class FlowField {
    constructor(seed = 1) {
      this.seed = seed >>> 0;
    }

    // returns angle in radians
    angle(x, y) {
      const ns = window.CFG.noiseScale;
      const n1 = U.valueNoise2D(x * ns, y * ns, this.seed);
      const n2 = U.valueNoise2D(x * ns * 1.9 + 10.0, y * ns * 1.9 - 7.0, this.seed ^ 0x9e3779b9);
      const t = (n1 * 0.65 + n2 * 0.35);
      return t * Math.PI * 2.0;
    }

    // curl-like vector (dx,dy)
    vec(x, y) {
      const a = this.angle(x, y);
      const c = Math.cos(a), s = Math.sin(a);
      return { x: c, y: s };
    }
  }

  window.FlowField = FlowField;
})();
