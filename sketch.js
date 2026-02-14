// sketch.js
(() => {
  const canvas = document.getElementById("c");
  const resetBtn = document.getElementById("resetBtn");
  const saveBtn  = document.getElementById("saveBtn");

  // Save表示制御
  if (CFG.UI.showSave) saveBtn.style.display = "inline-block";

  // 初期化
  const resizeAll = () => {
    const W = window.innerWidth;
    const H = window.innerHeight;

    Render.resize(canvas, W, H);
    Particles.resize(W, H);
  };

  const fullReset = () => {
    Field.reset();
    Particles.reset();
    U.toast("reset", 650);
  };

  // iPhone Safariで「ボタン押したのにcanvas側が反応」問題を避ける
  resetBtn.addEventListener("click", (e) => { e.preventDefault(); fullReset(); }, { passive:false });

  // 保存はオプション（iOSは挙動が端末差あるのでデフォルト非表示）
  saveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    try{
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "touching-light.png";
      a.click();
      U.toast("saved", 900);
    }catch(err){
      U.toast("save failed", 1200);
    }
  }, { passive:false });

  Input.bind(canvas);
  resizeAll();
  fullReset();

  // perf auto-tuning（粒子が多すぎるとiPhoneでカクつく）
  let last = U.now();
  let fps = 60;
  let perfLast = U.now();
  let degradeStep = 0;

  const loop = () => {
    const t = U.now();
    let dt = (t - last) / 1000;
    last = t;
    dt = U.stableDt(dt);

    // 入力更新
    Input.step();
    const inp = Input.state();

    // 粒子更新
    Particles.step(dt, inp);

    // 描画
    Render.draw(Particles.get());

    // FPS推定
    fps = U.lerp(fps, 1/dt, 0.08);

    // 自動軽量化（必要なときだけ）
    if (t - perfLast > CFG.PERF.checkIntervalMs) {
      perfLast = t;

      if (fps < CFG.PERF.degradeBelowFps && degradeStep < CFG.PERF.maxDegradeSteps) {
        // 粒子数を減らす（霧を減らすのが一番効くが、ここでは全体リセットで簡単に）
        degradeStep++;
        CFG.P.countMobile = Math.floor(CFG.P.countMobile * 0.88);
        CFG.P.countDesktop = Math.floor(CFG.P.countDesktop * 0.92);
        fullReset();
        U.toast(`perf tune (-)`, 700);
      } else if (fps > CFG.PERF.improveAboveFps && degradeStep > 0) {
        degradeStep--;
        CFG.P.countMobile = Math.floor(CFG.P.countMobile / 0.92);
        CFG.P.countDesktop = Math.floor(CFG.P.countDesktop / 0.96);
        fullReset();
        U.toast(`perf tune (+)`, 700);
      }
    }

    requestAnimationFrame(loop);
  };

  window.addEventListener("resize", () => {
    resizeAll();
    fullReset();
  });

  requestAnimationFrame(loop);
})();
