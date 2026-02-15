// sketch.js
(() => {
  const canvas = document.getElementById('c');

  function get2DContext(c) {
    // iOS Safari: beginPath undefined が出る時は context取得が失敗している
    // → 2Dで取得し直し + fallback
    let ctx = null;
    try {
      ctx = c.getContext('2d', { alpha: false, desynchronized: !!CFG.DESYNC });
    } catch(e) {
      ctx = c.getContext('2d');
    }
    return ctx;
  }

  const ctx = get2DContext(canvas);

  // もしctxが取れないなら、ここで止めてメッセージ
  if (!ctx || typeof ctx.beginPath !== 'function') {
    alert('2D描画コンテキストの取得に失敗しました。Safariを再読み込みしてください。');
    return;
  }

  // state
  let W = 0, H = 0, DPR = 1;

  const perf = { fps: 60, _acc: 0, _frames: 0, _t: performance.now() };
  const input = new Input(canvas);
  let field = new Field(1,1);
  let ps = new ParticleSystem(1,1);
  let renderer = new Renderer(canvas, ctx, 1,1);

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    const dpr = Math.min(CFG.DPR_MAX, window.devicePixelRatio || 1);

    W = w; H = h; DPR = dpr;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    // scale to CSS pixels
    ctx.setTransform(dpr,0,0,dpr,0,0);

    field.resize(w, h);
    ps.resize(w, h);
    renderer.resize(w, h);

    renderer.clear();
  }

  // iOS: 初回表示が真っ黒になるのを避けるため、確実に一度描画
  function warmup() {
    renderer.clear();
  }

  // Reset button
  const resetBtn = document.getElementById('resetBtn');
  resetBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    ps.reset();
    input.reset();
    renderer.clear();
  }, { passive: false });

  // iOS Safari: orientationchange/resize
  window.addEventListener('resize', () => resize(), { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(resize, 200), { passive: true });

  // main loop
  let last = performance.now();
  function loop() {
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.05);

    // perf calc
    perf._frames++;
    const span = (now - perf._t) / 1000;
    if (span >= 0.7) {
      perf.fps = perf._frames / span;
      perf._frames = 0;
      perf._t = now;
    }

    // update
    field.update(dt, input);
    const meta = ps.update(dt, field, input, perf);

    // render
    renderer.draw(ps, meta);

    requestAnimationFrame(loop);
  }

  // init
  resize();
  warmup();
  requestAnimationFrame(loop);
})();
