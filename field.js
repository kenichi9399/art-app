// field.js
(() => {
  const U = window.U, CFG = window.CFG, INPUT = window.INPUT;

  const FIELD = (window.FIELD = {
    w: 0, h: 0,
    cores: [],
    // ドラッグで刻まれる「流れ」(簡易グリッド)
    gx: 0, gy: 0,
    cell: 42,
    flow: null, // Float32Array (vx,vy)
  });

  function makeCore(x, y) {
    return {
      x, y,
      vx: U.randf(-0.2, 0.2),
      vy: U.randf(-0.2, 0.2),
      mass: CFG.CORE_MASS,
      alive: true
    };
  }

  FIELD.resize = function (w, h) {
    FIELD.w = w; FIELD.h = h;

    // flow grid
    FIELD.cell = Math.max(34, Math.min(60, Math.floor(Math.min(w, h) / 14)));
    FIELD.gx = Math.ceil(w / FIELD.cell);
    FIELD.gy = Math.ceil(h / FIELD.cell);
    FIELD.flow = new Float32Array(FIELD.gx * FIELD.gy * 2);

    FIELD.reset();
  };

  FIELD.reset = function () {
    // cores: 2〜3個 → 合体
    FIELD.cores = [];
    const n = CFG.CORE_COUNT || 3;
    const cx = FIELD.w * 0.55;
    const cy = FIELD.h * 0.45;

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = Math.min(FIELD.w, FIELD.h) * 0.06;
      FIELD.cores.push(makeCore(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }

    // flowクリア
    if (FIELD.flow) FIELD.flow.fill(0);
  };

  function flowIndex(x, y) {
    const ix = Math.max(0, Math.min(FIELD.gx - 1, (x / FIELD.cell) | 0));
    const iy = Math.max(0, Math.min(FIELD.gy - 1, (y / FIELD.cell) | 0));
    return (iy * FIELD.gx + ix) * 2;
  }

  // ドラッグで「流れを彫る」
  FIELD.carve = function (x0, y0, x1, y1, strength) {
    if (!FIELD.flow) return;

    const vx = x1 - x0;
    const vy = y1 - y0;
    const len = Math.hypot(vx, vy);
    if (len < 0.5) return;

    const [nx, ny] = U.norm(vx, vy);

    // 途中点にも撒く（深み）
    const steps = Math.min(10, Math.max(2, (len / 18) | 0));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = U.lerp(x0, x1, t);
      const y = U.lerp(y0, y1, t);
      const idx = flowIndex(x, y);
      FIELD.flow[idx + 0] += nx * strength;
      FIELD.flow[idx + 1] += ny * strength;
    }
  };

  FIELD.sampleFlow = function (x, y) {
    if (!FIELD.flow) return [0, 0];
    const idx = flowIndex(x, y);
    return [FIELD.flow[idx + 0], FIELD.flow[idx + 1]];
  };

  // cores update + merge
  FIELD.update = function (dt) {
    // 流れは少しずつ減衰
    if (FIELD.flow) {
      const f = FIELD.flow;
      for (let i = 0; i < f.length; i++) f[i] *= 0.98;
    }

    // 入力で彫る
    if (INPUT?.down && INPUT?.dragging) {
      FIELD.carve(INPUT.prev.x, INPUT.prev.y, INPUT.p.x, INPUT.p.y, CFG.DRAG_STRENGTH);
    }

    // core挙動：ゆっくり漂う + 互いに引き合い合体
    const cs = FIELD.cores;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (!c.alive) continue;

      // touchで少し寄る（白飛びしない程度）
      if (INPUT?.down) {
        const dx = INPUT.p.x - c.x;
        const dy = INPUT.p.y - c.y;
        const d = Math.hypot(dx, dy);
        if (d < (CFG.TOUCH_RADIUS * 0.9)) {
          c.vx += (dx / (d + 1e-6)) * 0.25 * dt;
          c.vy += (dy / (d + 1e-6)) * 0.25 * dt;
        }
      }

      // 微漂い
      c.vx += U.randf(-0.08, 0.08) * dt;
      c.vy += U.randf(-0.08, 0.08) * dt;

      c.vx *= 0.985;
      c.vy *= 0.985;

      c.x += c.vx * 60 * dt;
      c.y += c.vy * 60 * dt;

      // bounds
      c.x = U.clamp(c.x, FIELD.w * 0.15, FIELD.w * 0.85);
      c.y = U.clamp(c.y, FIELD.h * 0.15, FIELD.h * 0.85);
    }

    // merge: 近い核をゆっくり合体
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < cs.length; j++) {
        const b = cs[j];
        if (!b.alive) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);

        // 近づける
        const pull = CFG.CORE_MERGE_SPEED * dt;
        a.x += dx * pull;
        a.y += dy * pull;
        b.x -= dx * pull;
        b.y -= dy * pull;

        // 合体
        if (d < CFG.CORE_MERGE_DIST) {
          // aに統合
          a.mass += b.mass;
          a.vx = (a.vx + b.vx) * 0.5;
          a.vy = (a.vy + b.vy) * 0.5;
          b.alive = false;
        }
      }
    }

    // もし全部消えたら復帰（保険）
    const alive = cs.filter(c => c.alive);
    if (alive.length === 0) FIELD.reset();
  };

  FIELD.getMainCore = function () {
    // 一番massが大きい核を主核扱い
    let best = null, bm = -1;
    for (const c of FIELD.cores) {
      if (!c.alive) continue;
      if (c.mass > bm) { bm = c.mass; best = c; }
    }
    return best || FIELD.cores[0];
  };
})();
