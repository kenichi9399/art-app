// field.js
// ------------------------------------------------------------
// Flow field (v1.1)
// 目的：
// - 粒子が“ただ回る”だけでなく、層がぶつかり・ほどけ・残る（混ざりきらない）流れを作る
// - 中心（Void）付近は「静けさ」と「温度差」を出す：速度/渦/乱れを緩く制御
// - スマホでも破綻しにくい：セル単位で計算・ルックアップで参照
// ------------------------------------------------------------

(function () {
  const TAU = Math.PI * 2;

  // ---- tiny helpers (依存を増やさない) ----
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const fract = (x) => x - Math.floor(x);

  // hash / value noise（軽量）
  const hash2 = (x, y) => {
    // 乱数の種として十分な軽いハッシュ
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return fract(s);
  };

  const vnoise2 = (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = x0 + 1, y1 = y0 + 1;
    const sx = x - x0, sy = y - y0;

    const n00 = hash2(x0, y0);
    const n10 = hash2(x1, y0);
    const n01 = hash2(x0, y1);
    const n11 = hash2(x1, y1);

    const ux = sx * sx * (3 - 2 * sx);
    const uy = sy * sy * (3 - 2 * sy);

    const ix0 = lerp(n00, n10, ux);
    const ix1 = lerp(n01, n11, ux);
    return lerp(ix0, ix1, uy);
  };

  // curl-ish（擬似的に回転を作る）
  const curl2 = (x, y, t) => {
    // 近傍差分で回転っぽいベクトルを作る
    const e = 0.015;
    const n1 = vnoise2(x, y + e + t);
    const n2 = vnoise2(x, y - e + t);
    const a = (n1 - n2) / (2 * e);

    const n3 = vnoise2(x + e + t, y);
    const n4 = vnoise2(x - e + t, y);
    const b = (n3 - n4) / (2 * e);

    // (a, -b) が回転の雰囲気を出す
    const vx = a;
    const vy = -b;
    const m = Math.hypot(vx, vy) || 1;
    return { x: vx / m, y: vy / m };
  };

  // ------------------------------------------------------------
  // FlowField
  // ------------------------------------------------------------
  function FlowField(w, h) {
    this.resize(w, h);
    this.t = 0;
  }

  FlowField.prototype.resize = function (w, h) {
    this.w = w;
    this.h = h;
    this.cell = Math.max(18, (window.CFG && CFG.CELL) || 40);
    this.cols = Math.max(2, Math.ceil(w / this.cell));
    this.rows = Math.max(2, Math.ceil(h / this.cell));
    this.n = this.cols * this.rows;

    // 角度＋強度（lookup）
    this.ang = new Float32Array(this.n);
    this.mag = new Float32Array(this.n);

    // 画面中心
    this.cx = w * 0.5;
    this.cy = h * 0.5;
  };

  FlowField.prototype.step = function (dt) {
    const cfg = window.CFG || {};
    const time = (this.t += (cfg.FLOW_TIME || 0.02) * (dt || 1));

    // スケール（座標→ノイズ空間）
    const sc = cfg.FLOW_SCALE || 0.002;
    const baseStrength = cfg.FLOW_STRENGTH ?? 0.85;

    // Void（中心）の影響範囲：強すぎると全部が吸い込まれるので抑えめ
    const vr = cfg.VOID_R || 130;
    const vInfluenceR = vr * 2.2; // ここを大きくしすぎない
    const invR = 1 / Math.max(1, vInfluenceR);

    // 「層」っぽさ：外側ほど流れの温度が上がる（動きが増える）
    // 中心ほど静かに（magを抑える）
    for (let j = 0; j < this.rows; j++) {
      const y = (j + 0.5) * this.cell;
      const dy0 = y - this.cy;

      for (let i = 0; i < this.cols; i++) {
        const x = (i + 0.5) * this.cell;
        const dx0 = x - this.cx;

        const idx = j * this.cols + i;

        // 正規化距離（0:中心→1:外）
        const d = Math.hypot(dx0, dy0);
        const dn = clamp(d * invR, 0, 1);

        // 中心付近は静かに、外側ほど動きが増える
        const calm = 1 - smoothstep(0.00, 0.55, dn); // 中心ほど1
        const hot = smoothstep(0.15, 1.00, dn);      // 外側ほど1

        // 2種類の流れを混ぜる：
        // 1) curlノイズ（柔らかい渦）
        // 2) ゆるい“放射＋接線”成分（層の輪郭）
        const nx = x * sc;
        const ny = y * sc;

        const c = curl2(nx, ny, time * 0.25);

        // 放射/接線：中心の輪郭を作る（強すぎない）
        const rr = d > 0.0001 ? 1 / d : 0;
        const rx = dx0 * rr; // radial unit
        const ry = dy0 * rr;

        // tangential（接線）
        const tx = -ry;
        const ty = rx;

        // 温度差：外側ほど接線を増やし、内側ほどcurlを残して“膜”を作る
        const mixCurl = lerp(0.78, 0.42, hot);   // 外側でcurlを減らす
        const mixTan  = lerp(0.18, 0.58, hot);   // 外側で接線を増やす
        const mixRad  = lerp(0.04, 0.22, hot);   // 外側でわずかに放射も

        let vx =
          c.x * mixCurl +
          tx * mixTan +
          rx * mixRad;

        let vy =
          c.y * mixCurl +
          ty * mixTan +
          ry * mixRad;

        // “混ざりきらない層”を作るための微小な段差（セル単位）
        // dn（距離）に対して、位相の異なる微ノイズで角度を“薄くズラす”
        const micro = (vnoise2(nx * 6.0 + 10.0, ny * 6.0 + 3.0) - 0.5);
        const microAmt = 0.20 * hot + 0.08; // 外ほど少し強め
        const angMicro = micro * microAmt;

        // 回転
        const ca = Math.cos(angMicro), sa = Math.sin(angMicro);
        const rvx = vx * ca - vy * sa;
        const rvy = vx * sa + vy * ca;
        vx = rvx; vy = rvy;

        // 正規化
        const m0 = Math.hypot(vx, vy) || 1;
        vx /= m0; vy /= m0;

        // 強度設計：
        // - 中心（calm）では抑える（白飛び＆中央の暴れ防止）
        // - 外側で持ち上げる（層の運動量）
        // - さらに微妙な“温度揺らぎ”（ブレス）を乗せる
        const breathe = 0.06 + 0.10 * (0.5 + 0.5 * Math.sin(time * 0.35 + dn * 3.0));
        let mag =
          baseStrength *
          lerp(0.28, 1.05, hot) *
          (1 - 0.55 * calm) *
          (1 + breathe);

        // 角度と強度を格納
        this.ang[idx] = Math.atan2(vy, vx);
        this.mag[idx] = mag;
      }
    }
  };

  // px,py から flow ベクトルを返す（粒子側から呼ぶ）
  FlowField.prototype.sample = function (px, py) {
    // 範囲外はクランプ
    const x = clamp(px, 0, this.w - 1);
    const y = clamp(py, 0, this.h - 1);

    const i = clamp((x / this.cell) | 0, 0, this.cols - 1);
    const j = clamp((y / this.cell) | 0, 0, this.rows - 1);
    const idx = j * this.cols + i;

    const a = this.ang[idx];
    const m = this.mag[idx];

    return { x: Math.cos(a) * m, y: Math.sin(a) * m, a, m };
  };

  // グローバル公開（既存コードに合わせる）
  window.FlowField = FlowField;
})();
