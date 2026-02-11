// field.js
// -------------------------------------------------------
// Touching Light — Quiet Luxury / Field Memory
// 目的：
// - ドラッグ（触れ方）を「場の記憶」として残す
// - 粒子や筆致が、その記憶の流れに引かれて“意味”を帯びる
// 設計：
// - 低解像度グリッドに速度ベクトルを格納（軽い）
// - バイリニア補間でサンプル（滑らか）
// - 時間で減衰（蓄積しすぎて濁らない）
// -------------------------------------------------------

let mem = null;      // Float32Array: [vx,vy, vx,vy, ...]
let memW = 0;
let memH = 0;
let memStride = 2;   // vx, vy の2要素

/**
 * initField
 * 画面サイズに応じて場の記憶グリッドを作成
 */
function initField(w, h) {
  // CELL が小さいほど繊細になるが重くなる
  memW = Math.ceil(w / CFG.CELL) + 1;
  memH = Math.ceil(h / CFG.CELL) + 1;
  mem = new Float32Array(memW * memH * memStride);
}

/**
 * clearField
 * 場の記憶をゼロに戻す
 */
function clearField() {
  if (!mem) return;
  mem.fill(0);
}

/**
 * decayField
 * 場の記憶を指数減衰させる（濁り防止）
 * - praying時は減衰を緩めて「澄み／定着」を感じさせる
 */
function decayField(decay) {
  if (!mem) return;
  // Float32Arrayなので高速
  for (let i = 0; i < mem.length; i++) mem[i] *= decay;
}

/**
 * addToField
 * 指定座標に流れ（dx,dy）を加算
 * - dx,dy は正規化済みを推奨（強さは strength で）
 * - バイリニアで4セルに分配 → 滑らか
 */
function addToField(x, y, dx, dy, strength) {
  if (!mem) return;

  const gx = x / CFG.CELL;
  const gy = y / CFG.CELL;

  const ix = Math.floor(gx);
  const iy = Math.floor(gy);

  const fx = gx - ix;
  const fy = gy - iy;

  // 4近傍に分配
  for (let oy = 0; oy <= 1; oy++) {
    for (let ox = 0; ox <= 1; ox++) {
      const w = (ox ? fx : (1 - fx)) * (oy ? fy : (1 - fy));
      const cx = clamp(ix + ox, 0, memW - 1);
      const cy = clamp(iy + oy, 0, memH - 1);
      const id = (cy * memW + cx) * memStride;

      mem[id]     += dx * strength * w;
      mem[id + 1] += dy * strength * w;
    }
  }
}

/**
 * sampleField
 * 指定座標の流れベクトルを取得（バイリニア）
 */
function sampleField(x, y) {
  if (!mem) return { vx: 0, vy: 0 };

  const gx = x / CFG.CELL;
  const gy = y / CFG.CELL;

  const ix = Math.floor(gx);
  const iy = Math.floor(gy);

  const fx = gx - ix;
  const fy = gy - iy;

  let vx = 0, vy = 0;

  for (let oy = 0; oy <= 1; oy++) {
    for (let ox = 0; ox <= 1; ox++) {
      const w = (ox ? fx : (1 - fx)) * (oy ? fy : (1 - fy));
      const cx = clamp(ix + ox, 0, memW - 1);
      const cy = clamp(iy + oy, 0, memH - 1);
      const id = (cy * memW + cx) * memStride;

      vx += mem[id] * w;
      vy += mem[id + 1] * w;
    }
  }
  return { vx, vy };
}

/**
 * fieldEnergyAt
 * 任意座標の場の強さ（エネルギー）を返す
 * - デバッグや、演出（光を強くする）に使える
 */
function fieldEnergyAt(x, y) {
  const f = sampleField(x, y);
  return Math.sqrt(f.vx * f.vx + f.vy * f.vy);
}

/**
 * fieldNormalize
 * 場が暴れて白飽和や過剰な流れにならないよう、全体の上限を丸める
 * （必要になったときだけ呼ぶ。普段はコストなので呼ばない）
 */
function fieldNormalize(maxLen = 6.0) {
  if (!mem) return;
  const max2 = maxLen * maxLen;

  for (let i = 0; i < mem.length; i += 2) {
    const vx = mem[i];
    const vy = mem[i + 1];
    const m2 = vx * vx + vy * vy;
    if (m2 > max2) {
      const m = Math.sqrt(m2) + 1e-6;
      const s = maxLen / m;
      mem[i] = vx * s;
      mem[i + 1] = vy * s;
    }
  }
}
