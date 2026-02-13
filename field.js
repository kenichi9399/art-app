// field.js
// 流れ場：大きな「光核」へ寄る / 触れで歪む
(() => {
  function Field(app) {
    this.app = app;
    this.t = 0;
  }

  Field.prototype.sample = function (x, y) {
    // x,y: 0..1
    const a = this.app;
    const cx = a.light.x, cy = a.light.y;

    // base noise angle
    const n = U.fbm2(x * 2.0 + this.t * 0.12, y * 2.0 - this.t * 0.08, 4);
    let ang = (n - 0.5) * Math.PI * 2 * CFG.FIELD_WARP;

    // gentle pull towards core
    const dx = cx - x;
    const dy = cy - y;
    const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
    const pull = U.smoothstep(1.0, 0.0, d) * 0.85;
    ang += Math.atan2(dy, dx) * pull;

    // touch warp (swirl + pull)
    if (a.touch.down) {
      const tx = a.touch.x;
      const ty = a.touch.y;
      const ddx = tx - x;
      const ddy = ty - y;
      const td = Math.sqrt(ddx * ddx + ddy * ddy) + 1e-6;
      const tr = CFG.TOUCH_RADIUS;
      const w = U.smoothstep(tr, 0.0, td);

      const swirl = CFG.TOUCH_SWIRL * w;
      const pull2 = CFG.TOUCH_PULL * w;

      // swirl around touch
      ang += swirl * (Math.PI / 2);

      // pull towards touch
      ang = U.lerp(ang, Math.atan2(ddy, ddx), pull2 * 0.22);
    }

    const vx = Math.cos(ang);
    const vy = Math.sin(ang);
    return { vx, vy };
  };

  Field.prototype.step = function (dt) {
    this.t += dt * CFG.FIELD_SPEED;
  };

  window.Field = Field;
})();
