// sketch.js

(function(){
  const toastEl = document.getElementById("toast");
  const toastBox = toastEl?.querySelector("div");

  function toast(msg, ms=1200){
    if(!toastEl || !toastBox) return;
    toastBox.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>toastEl.classList.remove("show"), ms);
  }

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha:false, desynchronized:true });

  let w=0,h=0,pd=1;

  const particles = new Particles();
  const renderer = new Renderer(ctx);
  const input = new Input(canvas);

  let t = 0;
  let last = performance.now();
  let avgMs = 16.6;

  function resize(){
    const r = canvas.getBoundingClientRect();
    pd = Math.min(CFG.PD_MAX, window.devicePixelRatio || 1);

    // iOSで極端に重い場合の保険
    if(r.width*r.height > 1300*900 && pd > 1.5) pd = 1.5;

    canvas.width  = Math.floor(r.width * pd);
    canvas.height = Math.floor(r.height * pd);

    w = canvas.width;
    h = canvas.height;

    renderer.resize(w,h);
    particles.reset(w,h);

    ctx.fillStyle = CFG.BG;
    ctx.fillRect(0,0,w,h);

    toast("resized");
  }

  function hardReset(){
    // 画面を完全に初期化
    particles.scale = 1.0;
    particles.reset(w,h);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = CFG.BG;
    ctx.fillRect(0,0,w,h);

    toast("Reset");
  }

  function saveImage(){
    // iOS Safari：ダウンロード挙動が難しいので share を優先、無ければ dataURL を開く
    canvas.toBlob(async (blob)=>{
      if(!blob){ toast("保存に失敗"); return; }

      const file = new File([blob], "touching-light.png", { type:"image/png" });

      // 共有が使えるならそれが一番安定
      if(navigator.canShare && navigator.canShare({ files:[file] })){
        try{
          await navigator.share({ files:[file], title:"Touching Light" });
          toast("共有しました");
          return;
        }catch(_){}
      }

      // fallback: 画像を新規タブで開く（そこから保存）
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "touching-light.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 4000);

      toast("保存しました");
    }, "image/png");
  }

  input.onReset = hardReset;
  input.onSave  = saveImage;

  function adaptPerformance(ms){
    // 粒子数を少しずつ調整
    avgMs = avgMs * 0.92 + ms * 0.08;
    const target = CFG.PERF.TARGET_MS;

    const err = (avgMs - target) / target; // +:重い
    const k = CFG.PERF.ADAPT_RATE;

    particles.scale *= (1 - err * k);
    particles.scale = window.U.clamp(particles.scale, CFG.PERF.MIN_SCALE, CFG.PERF.MAX_SCALE);
  }

  function loop(now){
    const ms = now - last;
    last = now;

    // dt はfps基準で 1/60=0.0166
    const dt = Math.min(0.05, ms/1000);
    t += dt;

    input.update(dt);

    // touch情報を粒子へ
    particles.setTouch(input.x, input.y, input.down, input.press, input.vx, input.vy);

    // 更新
    particles.step(w, h, t, dt);

    // 描画
    renderer.clear();
    renderer.draw(particles);

    // 影・グレインなど
    VoidShadow.apply(ctx, w, h);

    adaptPerformance(ms);

    requestAnimationFrame(loop);
  }

  // 初期化
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(loop);
})();
