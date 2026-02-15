// sketch.js（Reset確実発火 + iOS安定）
(() => {
  const CFG = window.CFG, U = window.U;
  const INPUT = window.INPUT, FIELD = window.FIELD, P = window.PARTICLES;
  const VOID = window.VOID, R = window.RENDER;

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

  let dpr = 1;
  let w = 0, h = 0;
  let last = U.now();

  function resize() {
    dpr = Math.min(CFG.DPR_MAX || 2, window.devicePixelRatio || 1);

    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    FIELD.resize(w, h);
    P.resize(w, h);
    VOID.resize(w, h, dpr);
    R.resize(w, h, dpr);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
  }

  function resetAll() {
    FIELD.reset();
    P.reset();
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, w, h);
  }

  // ✅ Resetを「絶対に効かせる」
  const btn = document.getElementById("btnReset");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetAll();
  });

  // iOS Safari向け：touchstartでも確実に
  btn.addEventListener(
    "touchstart",
    (e) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      resetAll();
    },
    { passive: false }
  );

  window.addEventListener("resize", resize);

  function frame() {
    const now = U.now();
    let dt = (now - last) / 1000;
    last = now;

    dt = Math.min(dt, CFG.DT_MAX || 0.033);

    INPUT.tick();

    FIELD.update(dt);
    P.update(dt);

    R.draw(ctx, w, h);
    VOID.draw(ctx, w, h);

    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
})();
