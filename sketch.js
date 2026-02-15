// sketch.js
(() => {
  "use strict";

  const U = window.U;
  const CFG = window.CFG;
  const INPUT = window.INPUT;
  const FIELD = window.FIELD;
  const PARTICLES = window.PARTICLES;
  const VOID = window.VOID;
  const RENDER = window.RENDER;

  let canvas = null;
  let ctx = null;
  let rafId = 0;

  // --- Core（核）制御：2〜3個→ゆっくり合体→1つへ ---
  const CORE = (window.CORE = {
    cores: [],
    t: 0,
    reset() {
      this.t = 0;
      this.cores = [];

      // 2〜3個を初期配置（中央付近に“ゆっくり近づく”）
      const n = 2 + ((Math.random() * 1.999) | 0); // 2 or 3
      const cx = canvas.width * (0.5 + (Math.random() - 0.5) * 0.10);
      const cy = canvas.height * (0.55 + (Math.random() - 0.5) * 0.12);

      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
        const r = Math.min(canvas.width, canvas.height) * (0.08 + Math.random() * 0.06);
        this.cores.push({
          p: U.v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r),
          v: U.v2((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2),
          m: 1.0,
          alive: true,
        });
      }
    },
    tick(dt) {
      this.t += dt;

      // 中心（合体点）をゆっくり漂わせる
      const base = U.v2(
        canvas.width * 0.5 + Math.cos(this.t * 0.00012) * canvas.width * 0.06,
        canvas.height * 0.55 + Math.sin(this.t * 0.00010) * canvas.height * 0.07
      );

      // coresが2〜3個ある間、ゆっくり近づける
      for (const c of this.cores) {
        if (!c.alive) continue;
        const to = U.v2(base.x - c.p.x, base.y - c.p.y);
        c.v = U.v2(
          (c.v.x + to.x * 0.000035) * 0.985,
          (c.v.y + to.y * 0.000035) * 0.985
        );
        c.p = U.v2(c.p.x + c.v.x * dt, c.p.y + c.v.y * dt);

        // 端に逃げない保険
        c.p.x = Math.max(0, Math.min(canvas.width, c.p.x));
        c.p.y = Math.max(0, Math.min(canvas.height, c.p.y));
      }

      // 合体：距離が近いものから吸収
      if (this.cores.length >= 2) {
        for (let i = 0; i < this.cores.length; i++) {
          const a = this.cores[i];
          if (!a.alive) continue;
          for (let j = i + 1; j < this.cores.length; j++) {
            const b = this.cores[j];
            if (!b.alive) continue;
            const dx = a.p.x - b.p.x;
            const dy = a.p.y - b.p.y;
            const d2 = dx * dx + dy * dy;
            const th = Math.min(canvas.width, canvas.height) * 0.030;
            if (d2 < th * th) {
              // b を a に吸収
              a.m += b.m;
              a.p = U.v2((a.p.x + b.p.x) * 0.5, (a.p.y + b.p.y) * 0.5);
              b.alive = false;
            }
          }
        }
        this.cores = this.cores.filter(c => c.alive);
      }

      // 1つになった後も、粒子量で形が“わずかに変形”するイメージ（後で粒子側に渡す）
    },
    getMain() {
      if (!this.cores.length) return { p: U.v2(canvas.width * 0.5, canvas.height * 0.55), m: 1 };
      // いちばん質量が大きいものを核として扱う
      let best = this.cores[0];
      for (const c of this.cores) if (c.m > best.m) best = c;
      return best;
    },
  });

  function bindUI() {
    const btn = document.getElementById("btnReset");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        resetAll();
      });
    }
  }

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); // iPhoneで暴れにくい
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);

    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    // ctxは“論理座標で描く”ためにscale
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 各モジュールへ通知
    FIELD.resize?.(w, h);
    PARTICLES.resize?.(w, h);
    VOID.resize?.(w, h);
    RENDER.resize?.(w, h);

    // CORE も canvas論理サイズに合わせる（canvas.widthではなく w/h を基準にしたい）
    // ※COREはcanvasの実ピクセルでなく論理ピクセルで扱うため、ここでは styleサイズ(w,h)でOK
  }

  function resetAll() {
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);

    FIELD.reset?.(w, h);
    PARTICLES.reset?.(w, h);
    VOID.reset?.(w, h);
    CORE.reset();

    // タップ残りを掃除（「タップしても変化しない」原因の保険）
    if (INPUT) {
      INPUT.consumeTap?.();
      INPUT.down = false;
      INPUT.dragging = false;
      INPUT.longPress = false;
    }
  }

  function step(now) {
    rafId = requestAnimationFrame(step);

    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);

    // INPUT.tick：長押し判定更新など
    INPUT.tick?.();

    // ✅ タップが“必ず効く”ように、ここでtapImpulseを消費する設計に統一
    // tapImpulse は input.js が保持しているので、sketchが粒子へ明示的に渡す
    const tap = (INPUT.tapImpulse === 1) ? { p: INPUT.tapPos, t: INPUT.tapTime } : null;

    // 時間
    const dt = 16.67; // 安定化（可変dtでiPhoneがカクつくケースを避ける）
    CORE.tick(dt);

    // “核”情報を粒子へ渡す（粒子側が使えるように window.CORE.getMain() を参照）
    const core = CORE.getMain();

    // フィールド・粒子更新（粒子数を少し増やしたい＝1.2倍：cfgで調整する想定）
    FIELD.update?.(dt, INPUT);
    PARTICLES.update?.(dt, INPUT, core);
    VOID.update?.(dt, INPUT, core);

    // 描画
    RENDER.draw?.(ctx, core);

    // tapImpulseをここで消費（次フレームに残さない）
    if (tap) INPUT.consumeTap?.();
  }

  function boot() {
    canvas = document.getElementById("c");
    ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

    // iOS Safariのスクロール干渉を抑える
    canvas.style.touchAction = "none";

    // 入力をcanvasにattach（これがないと“タップしても変化しない”）
    INPUT.attach?.(canvas);

    bindUI();
    resize();
    resetAll();

    window.addEventListener("resize", () => {
      resize();
      resetAll();
    });

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(step);
  }

  boot();
})();
