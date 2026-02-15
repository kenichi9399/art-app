// sketch.js
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

    // 初回は真っ黒から始まらないように
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,w,h);
  }

  function resetAll() {
    FIELD.reset();
    P.reset();
    // 画面も軽くリセット
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0,0,w,h);
  }

  document.getElementById("btnReset").addEventListener("click", () => {
    resetAll();
  });

  window.addEventListener("resize", resize);

  function frame() {
    const now = U.now();
    let dt = (now - last) / 1000;
    last = now;

    // dt上限（背景が真っ白/真っ黒に飛ぶのを防ぐ）
    dt = Math.min(dt, CFG.DT_MAX || 0.033);

    // 入力判定更新
    INPUT.tick();

    // 更新
    FIELD.update(dt);
    P.update(dt);

    // 描画
    R.draw(ctx, w, h);
    VOID.draw(ctx, w, h);

    requestAnimationFrame(frame);
  }

  // 起動
  resize();
  requestAnimationFrame(frame);
})();
