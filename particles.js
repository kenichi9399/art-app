// particles.js

const Particles = (() => {
  let P = [];
  let D = [];

  const makeOne = (type, core) => {
    // distribution: more density near core, but not only
    const near = Math.random() < 0.62;
    let x, y;

    if (near) {
      const a = Math.random() * U.TAU;
      const r = Math.pow(Math.random(), 1.8) * 0.22; // tighter near core
      x = core.x + Math.cos(a) * r;
      y = core.y + Math.sin(a) * r;
    } else {
      x = Math.random();
      y = Math.random();
    }

    x = U.clamp(x, 0, 1);
    y = U.clamp(y, 0, 1);

    const v = U.randn() * 0.002;
    const w = U.randn() * 0.002;

    if (type === "P") {
      const big = Math.random() < CFG.P.rBigChance;
      const r = big
        ? U.rand(CFG.P.rBigMax, CFG.P.rBigMin)
        : U.rand(CFG.P.rMax, CFG.P.rMin);

      const a = U.rand(CFG.P.alphaMax, CFG.P.alphaMin);
      return {
        x, y, vx: v, vy: w,
        r, a,
        tw: Math.random() * 1000,
        sp: Math.random(),
      };
    } else {
      const r = U.rand(CFG.DUST.rMax, CFG.DUST.rMin);
      const a = U.rand(CFG.DUST.alphaMax, CFG.DUST.alphaMin);
      return {
        x, y, vx: v * 0.7, vy: w * 0.7,
        r, a,
        tw: Math.random() * 1000,
      };
    }
  };

  const init = (core, countP, countD) => {
    P = [];
    D = [];
    for (let i = 0; i < countP; i++) P.push(makeOne("P", core));
    for (let i = 0; i < countD; i++) D.push(makeOne("D", core));
  };

  const stepOne = (p, dt, core, input) => {
    // flow
    const f = Field.sample(p.x, p.y, dt * 0.35, core);

    // jitter (tiny)
    const jx = (U.randn() * CFG.P.jitter) * dt;
    const jy = (U.randn() * CFG.P.jitter) * dt;

    let ax = f.x + jx;
    let ay = f.y + jy;

    // interaction
    if (input.down) {
      const dx = p.x - input.x;
      const dy = p.y - input.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
      const R = CFG.INPUT.influenceRadius / Math.max(1, _w); // normalized via _w set in resize
      const k = U.clamp(1 - d / R, 0, 1);

      if (k > 0) {
        const n = { x: dx / d, y: dy / d };

        // pull towards touch (soft)
        const pull = -CFG.INPUT.pull * k;

        // swirl around touch
        const sw = CFG.INPUT.swirl * k;
        const sx = -n.y * sw;
        const sy = n.x * sw;

        // brush along finger velocity
        const bx = input.vx * CFG.INPUT.brush * k * 8.0;
        const by = input.vy * CFG.INPUT.brush * k * 8.0;

        // long-press: compress into a denser "膜"
        const lp = input.longPress ? (0.45 * k) : 0;

        ax += n.x * pull + sx + bx - n.x * lp;
        ay += n.y * pull + sy + by - n.y * lp;
      }
    }

    // integrate
    p.vx += ax * dt;
    p.vy += ay * dt;

    // clamp velocity
    const vm = CFG.P.vMax;
    const vv = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (vv > vm) {
      p.vx = (p.vx / vv) * vm;
      p.vy = (p.vy / vv) * vm;
    }

    p.vx *= Math.pow(CFG.P.damping, dt * 60);
    p.vy *= Math.pow(CFG.P.damping, dt * 60);

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // wrap gently (to keep density)
    if (p.x < -0.02) p.x = 1.02;
    if (p.x > 1.02) p.x = -0.02;
    if (p.y < -0.02) p.y = 1.02;
    if (p.y > 1.02) p.y = -0.02;

    // sparkle
    p.tw += dt * (0.8 + p.sp * 1.2);
  };

  const stepDust = (p, dt, core, input) => {
    const f = Field.sample(p.x, p.y, dt * 0.22, core);

    let ax = f.x * 0.55;
    let ay = f.y * 0.55;

    if (input.down) {
      const dx = p.x - input.x;
      const dy = p.y - input.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
      const R = (CFG.INPUT.influenceRadius * 0.85) / Math.max(1, _w);
      const k = U.clamp(1 - d / R, 0, 1);
      if (k > 0) {
        const n = { x: dx / d, y: dy / d };
        const sw = 0.75 * k;
        ax += (-n.y * sw) + input.vx * 4.5 * k;
        ay += ( n.x * sw) + input.vy * 4.5 * k;
      }
    }

    p.vx += ax * dt;
    p.vy += ay * dt;

    const vm = CFG.DUST.vMax;
    const vv = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (vv > vm) {
      p.vx = (p.vx / vv) * vm;
      p.vy = (p.vy / vv) * vm;
    }

    p.vx *= Math.pow(CFG.DUST.damping, dt * 60);
    p.vy *= Math.pow(CFG.DUST.damping, dt * 60);

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < -0.02) p.x = 1.02;
    if (p.x > 1.02) p.x = -0.02;
    if (p.y < -0.02) p.y = 1.02;
    if (p.y > 1.02) p.y = -0.02;

    p.tw += dt * 0.65;
  };

  // width/height normalized helpers set by Render.resize() (global-ish)
  let _w = 1000;

  const setNormScale = (w) => { _w = w; };

  const step = (dt, core, input) => {
    for (let i = 0; i < P.length; i++) stepOne(P[i], dt, core, input);
    for (let i = 0; i < D.length; i++) stepDust(D[i], dt, core, input);
  };

  const data = () => ({ P, D });

  const reset = (core, countP, countD) => init(core, countP, countD);

  return { init, step, data, reset, setNormScale };
})();
