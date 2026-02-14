// ==========================================================
// particles.js（高品質粒子版）
// ・白飛び防止
// ・粒サイズ多層化
// ・核との融合
// ・スマホ最適化
// ==========================================================

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;

    // ★ サイズ分布（重要）
    const r = Math.random();
    if (r < 0.6) this.size = Math.random() * 0.7 + 0.2;     // 微粒子
    else if (r < 0.9) this.size = Math.random() * 1.2 + 0.5;
    else this.size = Math.random() * 2.5 + 1.2;             // アクセント粒

    this.life = Math.random() * 100;
  }

  update(core, input) {
    // 核への引力（弱め）
    const dx = core.x - this.x;
    const dy = core.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;

    const gravity = 0.0008;
    this.vx += (dx / dist) * gravity;
    this.vy += (dy / dist) * gravity;

    // タッチ時
    if (input.active) {
      const tx = input.x - this.x;
      const ty = input.y - this.y;
      const td = Math.sqrt(tx * tx + ty * ty) + 0.01;

      // 白飛び防止：強すぎない吸引
      const touchForce = input.mode === "gather" ? 0.002 : -0.0015;
      this.vx += (tx / td) * touchForce;
      this.vy += (ty / td) * touchForce;
    }

    // 摩擦
    this.vx *= 0.985;
    this.vy *= 0.985;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx) {
    const alpha = Math.min(0.85, this.size * 0.5);

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ==========================================================
// 粒子群管理
// ==========================================================

class ParticleField {
  constructor(count, w, h) {
    this.particles = [];

    for (let i = 0; i < count; i++) {
      this.particles.push(
        new Particle(Math.random() * w, Math.random() * h)
      );
    }
  }

  update(core, input) {
    this.particles.forEach(p => p.update(core, input));
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }
}
