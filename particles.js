// particles.js

(function(){
  const { rand, clamp } = window.U;

  function pickSize(){
    const r = Math.random();
    const S = CFG.SIZE;

    if(r < S.RATIO_SMALL){
      // 小：多い。少し偏り（小さめが多い）
      const t = Math.pow(Math.random(), 1.8);
      return S.SMALL_MIN + (S.SMALL_MAX - S.SMALL_MIN) * t;
    }
    if(r < S.RATIO_SMALL + S.RATIO_MID){
      // 中：ほどほど
      const t = Math.pow(Math.random(), 1.2);
      return S.MID_MIN + (S.MID_MAX - S.MID_MIN) * t;
    }
    // 大：レア（光の粒の“核”になりやすい）
    const t = Math.pow(Math.random(), 0.85);
    return S.BIG_MIN + (S.BIG_MAX - S.BIG_MIN) * t;
  }

  function Particles(){
    this.p = [];
    this.scale = 1.0; // 自動調整用
    this.touch = {x:0,y:0,down:false,press:0, vx:0, vy:0};
  }

  Particles.prototype.reset = function(w, h){
    this.p.length = 0;

    // 端末負荷に合わせて個数調整
    const n = Math.floor(clamp(CFG.N_BASE * this.scale, CFG.N_MIN, CFG.N_MAX));

    for(let i=0;i<n;i++){
      const s = pickSize();
      this.p.push({
        x: Math.random()*w,
        y: Math.random()*h,
        vx: 0,
        vy: 0,
        r: s,
        a: 0.35 + Math.random()*0.65, // 個体差
        life: Math.random()
      });
    }
  };

  Particles.prototype.setTouch = function(x, y, down, press, vx, vy){
    this.touch.x = x; this.touch.y = y;
    this.touch.down = !!down;
    this.touch.press = press || 0;
    this.touch.vx = vx || 0;
    this.touch.vy = vy || 0;
  };

  Particles.prototype.step = function(w, h, t, dt){
    const M = CFG.MOTION;
    const T = CFG.TOUCH;
    const WR = M.WRAP_MARGIN;

    const sub = Math.max(1, M.SUBSTEPS|0);
    const sdt = dt / sub;

    for(let k=0;k<sub;k++){
      for(let i=0;i<this.p.length;i++){
        const o = this.p[i];

        // フィールド
        const f = Field.sample(o.x, o.y, t);
        let ax = f[0] * M.SPEED;
        let ay = f[1] * M.SPEED;

        // 微細揺らぎ（粒を“生かす”）
        ax += (Math.random()*2-1) * M.JITTER;
        ay += (Math.random()*2-1) * M.JITTER;

        // タッチ：引き + 渦（長押しで増）
        if(this.touch.down){
          const dx = this.touch.x - o.x;
          const dy = this.touch.y - o.y;
          const d2 = dx*dx + dy*dy;
          const rr = T.RADIUS * T.RADIUS;

          if(d2 < rr){
            const d = Math.sqrt(d2) || 1;
            const ndx = dx / d;
            const ndy = dy / d;

            const pBoost = 1 + this.touch.press * (T.PRESS_BOOST - 1);
            const fall = 1 - (d / T.RADIUS);
            const wgt = fall * fall;

            // 引力
            ax += ndx * T.PULL * wgt * pBoost;
            ay += ndy * T.PULL * wgt * pBoost;

            // 渦（接線方向）
            ax += (-ndy) * T.SWIRL * wgt * pBoost;
            ay += ( ndx) * T.SWIRL * wgt * pBoost;

            // タッチの“移動”も少し反映（ドラッグのニュアンス）
            ax += this.touch.vx * 0.0035 * wgt;
            ay += this.touch.vy * 0.0035 * wgt;
          }
        }

        // 加速度→速度
        o.vx = (o.vx + ax) * M.DAMP;
        o.vy = (o.vy + ay) * M.DAMP;

        // 速度にサイズ依存（小さいほど軽く揺れる）
        const mass = 0.55 + o.r * 0.25;
        o.x += (o.vx / mass) * (sdt * 60);
        o.y += (o.vy / mass) * (sdt * 60);

        // ラップ（端を抜けても連続感）
        if(o.x < -WR) o.x = w + WR;
        else if(o.x > w + WR) o.x = -WR;

        if(o.y < -WR) o.y = h + WR;
        else if(o.y > h + WR) o.y = -WR;

        o.life += 0.002 + Math.random()*0.002;
        if(o.life > 1) o.life -= 1;
      }
    }
  };

  window.Particles = Particles;
})();
