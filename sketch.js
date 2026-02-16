;(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

  let W = 0, H = 0, DPR = 1;

  let input, field, particles, voidShadow, renderer;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, CFG.DPR_MAX);
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);

    canvas.width  = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (!field) field = new Field(W, H, 18);
    else field.resize(W, H);

    if (!particles) particles = new Particles(W, H);
    else particles.resize(W, H);
  }

  function resetAll() {
    // 黒いだけにならないよう、背景も一度描く
    particles.reset();
    field.step();
    voidShadow.draw(ctx, W, H);
  }

  // init
  function init() {
    voidShadow = new VoidShadow();
    renderer = new Renderer();
    input = new Input(canvas);

    resize();
    voidShadow.draw(ctx, W, H);

    const resetBtn = document.getElementById("resetBtn");
    resetBtn.addEventListener("click", () => {
      resetAll();
    });

    // iOSでの復帰（タブ復帰/画面ロック解除）でも止まりにくく
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        // 軽く再初期化
        resize();
        voidShadow.draw(ctx, W, H);
      }
    });

    window.addEventListener("resize", () => {
      resize();
      voidShadow.draw(ctx, W, H);
    });

    loop();
  }

  // main loop
  let last = U.now();
  function loop() {
    const now = U.now();
    let dt = (now - last) / 1000;
    last = now;

    // 安全ガード（復帰直後の巨大dtで崩れない）
    dt = Math.min(dt, 0.05);

    // 入力更新
    input.update(dt);

    // ドラッグで“流れを彫る”
    if (input.down) {
      const p0 = U.sub(input.pos, input.delta);
      const p1 = input.pos;
      const strength = CFG.DRAG_CARVE;
      field.addFlowLine(p0, p1, strength);
    }

    field.step();
    particles.step(dt, field, input);

    // 描画
    renderer.clear(ctx, W, H);
    renderer.drawParticles(ctx, particles.ps);
    renderer.drawCores(ctx, particles.cores);

    requestAnimationFrame(loop);
  }

  // 起動（依存がwindowに出ていることを確認してから）
  // ここが欠けると “Particles undefined” が起きる
  function waitDepsAndStart() {
    const ok =
      window.CFG && window.U &&
      window.Input && window.Field &&
      window.Particles && window.VoidShadow && window.Renderer;

    if (!ok) {
      requestAnimationFrame(waitDepsAndStart);
      return;
    }
    init();
  }

  waitDepsAndStart();
})();
