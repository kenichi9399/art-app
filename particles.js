// particles.js
(function(){
  class Core {
    constructor(w,h){
      this.x = w*0.52;
      this.y = h*0.48;
      this.vx = 0;
      this.vy = 0;
      this.energy = 0.35;
      this.phase = Math.random()*10;
    }
    reset(w,h){
      this.x = w*0.52;
      this.y = h*0.48;
      this.vx = 0; this.vy = 0;
      this.energy = 0.35;
    }
    step(dt,w,h,force){
      // slow drift + gentle spring to center-ish
      const cx=w*0.52, cy=h*0.48;
      const ax = (cx-this.x)*0.00002;
      const ay = (cy-this.y)*0.00002;

      // touch “attract” moves the core slightly (feel alive)
      this.vx += (force.fx||0) * 0.00008;
      this.vy += (force.fy||0) * 0.00008;

      // drift noise
      const n = U.fbm(this.x*0.0012 + this.phase, this.y*0.0012 - this.phase, 3);
      this.vx += (Math.cos(n*2.2))*CFG.CORE_DRIFT*0.0008 + ax;
      this.vy += (Math.sin(n*2.2))*CFG.CORE_DRIFT*0.0008 + ay;

      this.vx *= 0.985;
      this.vy *= 0.985;

      this.x += this.vx*dt;
      this.y += this.vy*dt;

      // bounds
      const m=40;
      if(this.x<m){ this.x=m; this.vx*=-0.5; }
      if(this.x>w-m){ this.x=w-m; this.vx*=-0.5; }
      if(this.y<m){ this.y=m; this.vy*=-0.5; }
      if(this.y>h-m){ this.y=h-m; this.vy*=-0.5; }

      // breathe
      this.phase += dt*0.00035;
    }
  }

  class ParticleSystem {
    constructor(w,h){
      this.w=w; this.h=h;
      this.core = new Core(w,h);
      this.p = [];
      this._spawn();
      this._touchEnergy = 0;
    }

    resize(w,h){
      this.w=w; this.h=h;
      // keep count proportional
      const target = this._targetCount(w,h);
      this._resizeCount(target);
    }

    reset(){
      this.core.reset(this.w,this.h);
      this.p.length=0;
      this._spawn();
      this._touchEnergy = 0;
    }

    _targetCount(w,h){
      const area = w*h;
      const base = Math.floor(area/10000 * CFG.DENSITY_PER_10KPX);
      return U.clamp(base, CFG.MIN_PARTICLES, CFG.MAX_PARTICLES);
    }

    _resizeCount(n){
      if(this.p.length<n){
        const add = n-this.p.length;
        for(let i=0;i<add;i++) this.p.push(this._newParticle());
      }else if(this.p.length>n){
        this.p.length=n;
      }
    }

    _spawn(){
      const n = this._targetCount(this.w,this.h);
      for(let i=0;i<n;i++) this.p.push(this._newParticle());
    }

    _newParticle(){
      const x = Math.random()*this.w;
      const y = Math.random()*this.h;

      const s = U.pickSize();
      // heavier for bigger
      const mass = U.lerp(0.65, 1.6, U.clamp((s-0.4)/(6.2-0.4),0,1));

      // subtle initial swirl around core to create “nucleus impression”
      const dx=x-this.core.x, dy=y-this.core.y;
      const r=Math.hypot(dx,dy)+1e-6;
      const tang = 0.18*Math.exp(-r/260);
      const vx = (-dy/r)*tang + (Math.random()-0.5)*0.10;
      const vy = ( dx/r)*tang + (Math.random()-0.5)*0.10;

      return {x,y,vx,vy,s,mass,life:Math.random()};
    }

    step(dt, field, input){
      const w=this.w, h=this.h;
      // normalize dt (ms -> multiplier around 1 at 16.6ms)
      const k = U.clamp(dt/16.6, 0.4, 2.2);

      // touch “force” summary
      const touch = input.force(); // {x,y, mode, fx, fy, strength}
      const hasTouch = touch.active;

      // core reacts slightly to touch
      this.core.step(dt,w,h,{fx:hasTouch?touch.fx:0, fy:hasTouch?touch.fy:0});

      // energy for brightness (but clamp to avoid white-out)
      this._touchEnergy = U.lerp(this._touchEnergy, hasTouch?1:0, 0.06*k);

      // Update particles
      const core=this.core;
      const cr=CFG.CORE_RADIUS;
      const cs=CFG.CORE_SOFT;

      for(let i=0;i<this.p.length;i++){
        const a=this.p[i];

        // field flow
        const f = field.sample(a.x,a.y,w,h);
        a.vx += f.vx * CFG.FIELD_STRENGTH * 0.22 * k;
        a.vy += f.vy * CFG.FIELD_STRENGTH * 0.22 * k;

        // gentle jitter (alive but not noisy)
        const jx = (Math.random()-0.5)*CFG.JITTER;
        const jy = (Math.random()-0.5)*CFG.JITTER;
        a.vx += jx*0.12*k;
        a.vy += jy*0.12*k;

        // core pull: stronger when long-press (gather), weaker otherwise
        const dx = core.x-a.x, dy = core.y-a.y;
        const r = Math.hypot(dx,dy)+1e-6;
        const near = U.smoothstep(cs, cr, r); // 0 far, 1 near core
        const basePull = CFG.CORE_PULL * (0.16 + 0.42*near);

        a.vx += (dx/r) * basePull * 0.08 * k;
        a.vy += (dy/r) * basePull * 0.08 * k;

        // Touch interactions:
        // - tap: impulse
        // - drag: scatter / swirl
        // - longpress: attract (gather)
        if(hasTouch){
          const tx = touch.x - a.x;
          const ty = touch.y - a.y;
          const tr = Math.hypot(tx,ty)+1e-6;
          const falloff = Math.exp(-tr/220);

          if(touch.mode === 'tap'){
            a.vx -= (tx/tr) * CFG.TAP_IMPULSE * 0.22 * falloff * k;
            a.vy -= (ty/tr) * CFG.TAP_IMPULSE * 0.22 * falloff * k;
          }else if(touch.mode === 'drag'){
            // scatter + slight swirl
            const scatter = CFG.DRAG_FORCE * 0.26 * falloff;
            a.vx -= (tx/tr) * scatter * k;
            a.vy -= (ty/tr) * scatter * k;

            const swirl = 0.18 * falloff;
            a.vx += (-ty/tr) * swirl * k;
            a.vy += ( tx/tr) * swirl * k;
          }else if(touch.mode === 'hold'){
            // gather toward touch point (forms “nucleus merging”)
            const attract = CFG.LONGPRESS_ATTRACT * 0.20 * falloff;
            a.vx += (tx/tr) * attract * k;
            a.vy += (ty/tr) * attract * k;
          }
        }

        // damping by mass
        const drag = CFG.DRAG - (a.mass-0.65)*0.01;
        a.vx *= drag;
        a.vy *= drag;

        a.x += a.vx * 1.2 * k;
        a.y += a.vy * 1.2 * k;

        // wrap softly
        if(a.x< -40) a.x = w+40;
        if(a.x> w+40) a.x = -40;
        if(a.y< -40) a.y = h+40;
        if(a.y> h+40) a.y = -40;

        a.life += 0.0025*k;
      }

      // core energy rises with local density (C: 粒子量で変形 の印象)
      // approximate density by sampling some particles
      let dens=0;
      for(let i=0;i<60;i++){
        const p=this.p[(i*73)%this.p.length];
        const r=Math.hypot(p.x-core.x,p.y-core.y);
        dens += Math.exp(-r/110);
      }
      dens /= 60;
      const targetE = U.clamp(0.25 + dens*0.85 + this._touchEnergy*0.35, 0.25, 1.0);
      core.energy = U.lerp(core.energy, targetE, 0.06*k);
    }
  }

  window.ParticleSystem = ParticleSystem;
})();
