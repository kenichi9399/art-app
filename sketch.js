// sketch.js
(() => {
  const canvas = document.getElementById('c');
  const resetBtn = document.getElementById('resetBtn');

  function panic(msg) {
    // index.html のエラーボックスへ出す
    const box = document.getElementById('err');
    if (box) {
      box.style.display = 'block';
      box.textContent = msg;
    } else {
      alert(msg);
    }
  }

  function get2DContext(c) {
    let ctx = null;
    try {
      ctx = c.getContext('2d', { alpha: false, desynchronized: !!(window.CFG && CFG.DESYNC) });
    } catch (_) {
      ctx = c.getContext('2d');
    }
    return ctx;
  }

  const ctx = get2DContext(canvas);
  if (!ctx || typeof ctx.beginPath !== 'function') {
    panic('2D context failed.\nSafariを再読み込みしてください。\n( ctx is null or beginPath missing )');
    return;
  }

  // ==== safe init ====
  let W = 0, H = 0, DPR = 1;
  const perf = { fps: 60, _frames: 0, _t: performance.now() };

  // 依存チェック（黒画面の原因が分かるように）
  if (!window.CFG) { panic('CFG is missing. cfg.js が読み込めていません'); return; }
  if (!window.U)   { panic('U is missing. utils.js が読み込めていません'); return; }
  if (!window.Input) { panic('Input is missing. input.js が読み込めていません'); return; }
  if (!window.Field) { panic('Field is missing. field.js が読み込めていません'); return; }
  if (!window.VoidShadow) { panic('VoidShadow is missing. void_shadow.js が読み込めていません'); return; }
  if (!window.ParticleSystem) { panic('ParticleSystem is missing. particles.js が読み込めていません'); return; }
  if (!window.Renderer) { panic('Renderer is missing. render.js が読み込めていません'); return; }

  const input = new Input(canvas);
  let field = new Field(1, 1);
  let ps = new ParticleSystem(1, 1);
  let renderer = new Renderer(canvas, ctx, 1, 1);

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    const dpr = Math.min(CFG.DPR_MAX || 2, window.devicePixelRatio || 1);

    W = w; H = h; DPR = dpr;

    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    // CSSピクセルに合わせる
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    field.resize(w, h);
    ps.resize(w, h);
    renderer.resize(w, h);

    renderer.clear();
  }

  // Reset（確実に反応させる）
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        ps.reset();
        input.reset?.();
        renderer.clear();
      } catch (err) {
        panic('Reset failed:\n' + String(err && err.stack ? err.stack : err));
      }
    }, { passive: false });
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(resize, 200), { passive: true });

  let last = performance.now();
  function loop() {
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.05);

    // fps
    perf._frames++;
    const span = (now - perf._t) / 1000;
    if (span >= 0.7) {
      perf.fps = perf._frames / span;
      perf._frames = 0;
      perf._t = now;
    }

    try {
      field.update(dt, input);
      const meta = ps.update(dt, field, input, perf);
      renderer.draw(ps, meta);
    } catch (err) {
      panic('Runtime error:\n' + String(err && err.stack ? err.stack : err));
      return; // ループ停止（真っ黒放置を防ぐ）
    }

    requestAnimationFrame(loop);
  }

  // init
  resize();
  requestAnimationFrame(loop);
})();
