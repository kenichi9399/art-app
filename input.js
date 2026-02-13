// sketch.js
(() => {
  const errUI = () => ({
    root: document.getElementById("err"),
    text: document.getElementById("errText"),
    show(msg){
      if (!this.root) return;
      this.text.textContent = msg;
      this.root.style.display = "flex";
    }
  });

  const toastUI = () => ({
    el: document.getElementById("toast"),
    show(msg = "Saved"){
      if (!this.el) return;
      this.el.textContent = msg;
      this.el.classList.add("show");
      clearTimeout(this._t);
      this._t = setTimeout(() => this.el.classList.remove("show"), 1200);
    }
  });

  function createApp() {
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

    const app = {
      canvas,
      ctx,
      w: 1, h: 1, dpr: 1,
      t: 0,
      last: U.now(),
      field: null,
      ps: null,
      renderer: null,
      light: { x: 0.34, y: 0.22 },
      touch: null,
      toast: toastUI(),
      err: errUI(),

      resize() {
        const fit = U.fitCanvas(canvas, CFG.DPR_MAX);
        this.w = fit.w; this.h = fit.h; this.dpr = fit.dpr;
        this.renderer.resize();
      },

      step(dt) {
        // decay impulse
        this.touch.impulse *= Math.pow(0.02, dt); // quick but smooth
        if (this.touch.impulse < 0.001) this.touch.impulse = 0;

        // small drift of “light core” (quiet living)
        this.t += dt;
        const drift = 0.0022;
        this.light.x = U.clamp(this.light.x + Math.sin(this.t * 0.12) * drift * dt, 0.18, 0.72);
        this.light.y = U.clamp(this.light.y + Math.cos(this.t * 0.10) * drift * dt, 0.12, 0.68);

        // if touching, light leans slightly toward touch (but not obey)
        if (this.touch.down) {
          this.light.x = U.lerp(this.light.x, this.touch.x, 0.018);
          this.light.y = U.lerp(this.light.y, this.touch.y, 0.018);
        }

        this.field.step(dt);
        this.ps.step(dt);
      },

      frame() {
        const now = U.now();
        let dt = (now - this.last) / 1000;
        this.last = now;
        dt = U.clamp(dt, 0, 0.033); // clamp big jumps

        this.step(dt);
        this.renderer.frame();
        requestAnimationFrame(() => this.frame());
      },

      async capture() {
        // iOSで勝手にpngダウンロードにならないように：
        // 1) 共有APIが使えれば share
        // 2) だめなら “新規タブで dataURL” は避けて、ダウンロードリンクを一時生成
        try {
          const scale = CFG.EXPORT_SCALE;
          const w = Math.floor(this.w * scale);
          const h = Math.floor(this.h * scale);

          const oc = document.createElement("canvas");
          oc.width = w; oc.height = h;
          const octx = oc.getContext("2d", { alpha: false });

          // render a single high-res frame by temporarily scaling
          // (簡易：現在の画面を拡大コピー)
          // 画質優先なら“再描画”が理想だが、まず安定重視。
          octx.imageSmoothingEnabled = true;
          octx.imageSmoothingQuality = "high";
          octx.drawImage(this.canvas, 0, 0, this.w, this.h, 0, 0, w, h);

          const blob = await new Promise((res) => oc.toBlob(res, "image/png", 0.92));
          if (!blob) throw new Error("toBlob failed");

          // share (best)
          if (navigator.canShare && navigator.canShare({ files: [new File([blob], "touching-light.png", { type: "image/png" })] })) {
            const file = new File([blob], "touching-light.png", { type: "image/png" });
            await navigator.share({ files: [file], title: "Touching Light" });
            this.toast.show("共有しました");
            return;
          }

          // fallback: download link (user action required)
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "touching-light.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1200);
          this.toast.show("保存しました");
        } catch (e) {
          this.toast.show("保存できませんでした");
          console.warn(e);
        }
      }
    };

    // modules
    app.field = new Field(app);
    app.ps = new ParticleSystem(app, CFG.P_COUNT, 20240214);
    app.renderer = new Renderer(app);
    new Input(app);

    // UI button
    const btn = document.getElementById("btnShot");
    if (btn) btn.addEventListener("click", () => app.capture());

    // resize
    const onResize = () => {
      try { app.resize(); }
      catch (e) { app.err.show(String(e.stack || e)); }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    // global error handler (so you see why it breaks)
    window.addEventListener("error", (ev) => {
      const msg = `${ev.message}\n\n${ev.filename}:${ev.lineno}:${ev.colno}`;
      app.err.show(msg);
    });
    window.addEventListener("unhandledrejection", (ev) => {
      app.err.show(String(ev.reason?.stack || ev.reason || ev));
    });

    // start
    onResize();
    return app;
  }

  // boot
  try {
    const app = createApp();
    app.frame();
  } catch (e) {
    const ui = errUI();
    ui.show(String(e.stack || e));
  }
})();
