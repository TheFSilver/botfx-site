/* botfx — interactions. Vanilla, léger. Tout se dégrade proprement sans JS. */
(() => {
  const root = document.documentElement;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const isReduced = () => root.dataset.motion === 'reduced';
  const listeners = new Set();
  const onMotionChange = (fn) => listeners.add(fn);

  /* ---------- pause des animations (WCAG 2.2.2) ---------- */
  const toggle = document.querySelector('[data-motion-toggle]');
  const syncToggle = () => {
    if (!toggle) return;
    const paused = isReduced();
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.querySelector('[data-label]').textContent = paused ? 'Relancer les animations' : 'Mettre en pause les animations';
  };
  syncToggle();
  toggle?.addEventListener('click', () => {
    const paused = !isReduced();
    if (paused) root.dataset.motion = 'reduced'; else delete root.dataset.motion;
    try { localStorage.setItem('botfx-motion', paused ? 'reduced' : 'full'); } catch (_) {}
    syncToggle();
    listeners.forEach((fn) => fn());
    document.dispatchEvent(new CustomEvent('botfx:motion'));
  });

  /* ---------- header ---------- */
  const top = document.querySelector('.top');
  const onScroll = () => {
    if (!top) return;
    top.classList.toggle('is-scrolled', scrollY > 24);
    const max = document.documentElement.scrollHeight - innerHeight;
    top.style.setProperty('--read', max > 0 ? (scrollY / max).toFixed(4) : '0');
  };
  const menuBtn = document.querySelector('[data-menu-toggle]');
  if (menuBtn) {
    const setMenu = (open) => { menuBtn.setAttribute('aria-expanded', String(open)); top.classList.toggle('menu-open', open); };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); } });
    top.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- titre mot par mot ---------- */
  document.querySelectorAll('[data-split]').forEach((el) => {
    const label = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', label);
    const build = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            const i = document.createElement('span'); i.textContent = part; w.append(i); frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') build(child);
      });
    };
    build(el);
    el.querySelectorAll('.w>span').forEach((s, i) => { s.style.transitionDelay = `${0.08 + i * 0.07}s`; s.style.setProperty('--i', i); });
    el.classList.add('split');
    requestAnimationFrame(() => requestAnimationFrame(() => el.closest('.hero, .page, section')?.classList.add('is-in')));
  });

  /* ---------- reveal au scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  revealEls.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('at-load'); });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
    let pending = false;
    addEventListener('scroll', () => {
      if (pending) return; pending = true;
      requestAnimationFrame(() => {
        pending = false;
        revealEls.forEach((el) => { if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in'); });
      });
    }, { passive: true });
  } else revealEls.forEach((el) => el.classList.add('is-in'));

  /* ---------- spotlight cartes + boutons ---------- */
  if (finePointer) {
    document.querySelectorAll('.card, .btn-primary').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
    /* cartes qui s'inclinent sous le curseur */
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (isReduced()) return;
        const r = el.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -5, ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
        el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
    /* boutons magnétiques */
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (isReduced()) return;
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
    /* halo qui suit le curseur */
    const glow = document.createElement('div');
    glow.className = 'cursor-glow'; glow.setAttribute('aria-hidden', 'true');
    document.body.prepend(glow);
    addEventListener('pointermove', (e) => {
      glow.style.setProperty('--cx', `${e.clientX}px`);
      glow.style.setProperty('--cy', `${e.clientY}px`);
    }, { passive: true });
  }

  /* ---------- progression de la méthode ---------- */
  const bar = document.querySelector('.progress');
  if (bar) {
    const steps = bar.closest('section');
    const upd = () => {
      const r = steps.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height * 0.9)));
      bar.style.setProperty('--p', p.toFixed(3));
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ---------- manifeste : les mots s'allument au scroll ---------- */
  document.querySelectorAll('[data-scrub]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    const full = el.textContent.trim();
    el.innerHTML = `<span class="sr-only">${full}</span>` + words.map((w) => `<span class="sw" aria-hidden="true">${w}</span>`).join(' ');
    const spans = el.querySelectorAll('.sw');
    const upd = () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.35)));
      const n = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < n));
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  });

  /* ---------- copier l'email ---------- */
  document.querySelectorAll('[data-copy-email]').forEach((btn) => {
    const label = btn.querySelector('[data-label]');
    const status = document.querySelector('[data-copy-status]');
    const initial = label.textContent;
    btn.addEventListener('click', async () => {
      const email = btn.dataset.copyEmail;
      try { await navigator.clipboard.writeText(email); }
      catch (_) {
        const t = document.createElement('textarea'); t.value = email; document.body.append(t); t.select();
        document.execCommand('copy'); t.remove();
      }
      label.textContent = 'Adresse copiée ✓';
      if (status) status.textContent = `${email} copiée dans le presse-papiers`;
      setTimeout(() => (label.textContent = initial), 2200);
    });
  });

  /* ---------- hero : sphère de points argentés, manipulable ---------- */
  const canvas = document.querySelector('[data-hero-canvas]');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const hero = canvas.closest('.hero');
    const N = innerWidth < 700 ? 900 : 1700;
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
      pts.push([Math.cos(th) * rad, y, Math.sin(th) * rad, Math.random(),
        (Math.random() - 0.5) * 4.4, (Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2.6]);
    }
    let W = 0, H = 0, dpr = 1, t = 0, raf = 0, visible = true, frames = 0;
    let tx = 0, ty = 0, mx = 0, my = 0;
    let order = 1, target = 1, spin = 0, vel = 0, pitch = 0;
    let R = 0, cx = 0, cy = 0, pulsesSent = 0;
    let px0 = -9999, py0 = -9999, drag = null;
    const pulses = [];

    const geometry = () => {
      const small = W < 760;
      R = small ? Math.min(W * 0.46, H * 0.2) : Math.min(W, H) * 0.34;
      cx = small ? W * 0.5 : W * 0.74; cy = small ? H * 0.22 : H * 0.46;
      canvas.dataset.cx = cx.toFixed(0); canvas.dataset.cy = cy.toFixed(0);
    };
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      geometry(); draw();
    };
    const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const onSphere = (x, y) => Math.hypot(x - cx, y - cy) < R * 1.5;

    addEventListener('pointermove', (e) => {
      const [x, y] = local(e);
      if (finePointer) { tx = (e.clientX / innerWidth - 0.5); ty = (e.clientY / innerHeight - 0.5); px0 = x; py0 = y; hero.classList.toggle('can-grab', onSphere(x, y) && !e.target.closest('a,button')); }
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
        spin += dx * 0.009; vel = dx * 0.009;
        pitch = Math.max(-0.9, Math.min(0.9, pitch + dy * 0.005));
        if (isReduced()) draw();
      }
    }, { passive: true });
    hero.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a,button,input')) return;
      const [x, y] = local(e);
      if (!onSphere(x, y)) return;
      drag = { x: e.clientX, y: e.clientY, moved: 0, px: x, py: y };
      vel = 0; hero.classList.add('is-grabbing');
    });
    const release = (cancelled) => {
      if (!drag) return;
      if (!cancelled && drag.moved < 6) {
        pulsesSent++; canvas.dataset.pulses = pulsesSent;
        if (!isReduced()) pulses.push({ x: drag.px, y: drag.py, age: 0 });
      }
      drag = null; hero.classList.remove('is-grabbing');
    };
    addEventListener('pointerup', () => release(false));
    addEventListener('pointercancel', () => release(true));
    canvas.dataset.pulses = 0;

    function draw() {
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      ctx.clearRect(0, 0, W, H);
      if (!drag) { spin += vel; vel *= 0.95; }
      const ay = spin + t * 0.12 + mx * 0.9, ax = 0.32 + my * 0.6 + pitch;
      const sy = Math.sin(ay), cyy = Math.cos(ay), sx = Math.sin(ax), cxx = Math.cos(ax);
      canvas.dataset.rot = ay.toFixed(3); canvas.dataset.order = order.toFixed(3); canvas.dataset.frames = frames;
      for (let i = pulses.length - 1; i >= 0; i--) { pulses[i].age += 0.016; if (pulses[i].age > 0.9) pulses.splice(i, 1); }
      const o = order, chaos = 1 - o;
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        const wob = 1 + 0.06 * Math.sin(p[1] * 6 + t * 0.9 + p[3] * 2) + 0.03 * Math.sin(p[0] * 9 - t * 0.7);
        const drift = chaos * 0.12 * Math.sin(t * 0.5 + p[3] * 9);
        const x = p[0] * wob * o + (p[4] + drift) * chaos, y = p[1] * wob * o + (p[5] - drift) * chaos, z = p[2] * wob * o + p[6] * chaos;
        const x1 = x * cyy - z * sy, z1 = x * sy + z * cyy;
        const y1 = y * cxx - z1 * sx, z2 = y * sx + z1 * cxx;
        const persp = 2.6 / (2.6 + z2);
        let px = cx + x1 * R * persp, py = cy + y1 * R * persp;
        /* les points s'écartent du curseur */
        const dx = px - px0, dy = py - py0, d = Math.hypot(dx, dy);
        if (d < 130 && d > 0.01) { const f = (1 - d / 130) ** 2 * 30; px += (dx / d) * f; py += (dy / d) * f; }
        /* onde de choc au clic */
        for (const w of pulses) {
          const wx = px - w.x, wy = py - w.y, wd = Math.hypot(wx, wy), ring = w.age * 520, gap = Math.abs(wd - ring);
          if (gap < 70 && wd > 0.01) { const f = (1 - gap / 70) * 34 * (1 - w.age / 0.9); px += (wx / wd) * f; py += (wy / wd) * f; }
        }
        const depth = Math.max(0, Math.min(1, (1 - z2) * 0.5));
        const a = 0.14 + depth * 0.86;
        ctx.fillStyle = `rgba(${215 + depth * 40 | 0},${218 + depth * 37 | 0},${224 + depth * 31 | 0},${a})`;
        const s = (0.7 + depth * 1.6) * persp;
        ctx.fillRect(px, py, s, s);
      }
      /* anneau orbital */
      ctx.globalAlpha = o;
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
      const rot = -0.35 + mx * 0.3;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.45, R * 0.42, rot, 0, Math.PI * 2); ctx.stroke();
      const th = t * 0.5, ox = cx + Math.cos(th) * R * 1.45 * Math.cos(rot) - Math.sin(th) * R * 0.42 * Math.sin(rot);
      const oy = cy + Math.cos(th) * R * 1.45 * Math.sin(rot) + Math.sin(th) * R * 0.42 * Math.cos(rot);
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(ox, oy, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    const loop = () => {
      t += 0.016; frames++;
      order += (target - order) * 0.05; if (Math.abs(target - order) < 0.002) order = target;
      draw(); raf = requestAnimationFrame(loop);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (!isReduced() && visible && !document.hidden) raf = requestAnimationFrame(loop); else { order = target; draw(); }
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }).observe(canvas);
    document.addEventListener('visibilitychange', run);
    onMotionChange(run);
    addEventListener('resize', resize);
    resize(); run();

    /* ---------- pilote automatique : la sphère se défait, les tâches s'accumulent ---------- */
    const sw = document.querySelector('[data-autopilot]');
    const backlogEl = document.querySelector('[data-backlog]');
    const lines = [...document.querySelectorAll('[data-ticker] li')];
    if (sw && backlogEl) {
      let on = true, backlog = 0, cursor = 0;
      const paint = () => {
        backlogEl.textContent = `${backlog} tâche${backlog > 1 ? 's' : ''} en attente`;
        hero.classList.toggle('is-off', !on);
      };
      const setLines = () => lines.forEach((l, i) => l.classList.toggle('done', on && (isReduced() || i <= cursor)));
      sw.addEventListener('click', () => {
        on = !on; target = on ? 1 : 0;
        sw.setAttribute('aria-checked', String(on));
        if (isReduced()) { order = target; backlog = on ? 0 : 12; draw(); }
        setLines(); paint();
      });
      setInterval(() => {
        if (isReduced() || document.hidden) return;
        if (on) { backlog = Math.max(0, backlog - 8); cursor = (cursor + 1) % (lines.length + 1); if (cursor === 0) cursor = 0; }
        else backlog += 2;
        setLines(); paint();
      }, 900);
      onMotionChange(() => { setLines(); paint(); });
      setLines(); paint();
    }
  }

  /* ---------- fond vivant : des points argentés qui se recomposent selon la section ---------- */
  (() => {
    const c = document.createElement('canvas');
    c.className = 'bg-field'; c.dataset.bgCanvas = ''; c.setAttribute('aria-hidden', 'true');
    document.body.prepend(c);
    const x = c.getContext('2d');
    const hero = document.querySelector('.hero');
    const SHAPES = { services: 'grid', cercle: 'orbit', machine: 'network', demain: 'wave', jeu: 'rain', calcul: 'grid', realisations: 'network', methode: 'wave', faq: 'orbit', contact: 'sphere' };
    const CYCLE = ['network', 'grid', 'wave', 'orbit'];
    const N = innerWidth < 700 ? 120 : 230;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const P = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      return { rx: Math.random(), ry: Math.random(), s: Math.random(), sx: Math.cos(th) * r, sy: y, sz: Math.sin(th) * r, x: 0, y: 0 };
    });
    let W = 0, H = 0, t = 0, raf = 0, frames = 0, alpha = 0, shape = 'network', net = 0, orb = 0, wav = 0, edges = [], px = -9999, py = -9999, pending = false, placed = false;
    const pulses = Array.from({ length: 6 }, () => ({ e: 0, k: Math.random() }));
    const targets = {
      grid: (p, i) => { const cols = Math.ceil(Math.sqrt(N * W / H)), cell = W / cols; return [(i % cols + 0.5) * cell, (Math.floor(i / cols) + 0.5) * cell - (scrollY * 0.04) % cell]; },
      orbit: (p, i) => { const ring = i % 4, R = (0.2 + ring * 0.15) * Math.min(W, H), a = i * golden + t * (ring % 2 ? 0.07 : -0.05); return [W * 0.5 + Math.cos(a) * R * 1.25, H * 0.5 + Math.sin(a) * R]; },
      network: (p) => [p.rx * W + Math.sin(t * 0.3 + p.s * 9) * 10, p.ry * H + Math.cos(t * 0.26 + p.s * 7) * 10],
      wave: (p, i) => { const k = i / N, band = i % 3; return [k * W, H * (0.5 + 0.2 * Math.sin(k * 7 + t * 0.5 + band * 0.9)) + (band - 1) * 34]; },
      rain: (p) => [p.rx * W, ((p.ry * H * 1.25 + t * 34 * (0.6 + p.s)) % (H * 1.25)) - H * 0.12],
      sphere: (p) => { const a = t * 0.1, ca = Math.cos(a), sa = Math.sin(a), R = Math.min(W, H) * 0.42, xr = p.sx * ca - p.sz * sa; return [W * 0.5 + xr * R, H * 0.5 + p.sy * R]; },
    };
    const linkEdges = () => {
      const pts = P.map((p) => [p.rx * W, p.ry * H]);
      edges = [];
      pts.forEach((a, i) => {
        pts.map((b, j) => [(a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2, j]).filter((d) => d[1] !== i).sort((m, n) => m[0] - n[0]).slice(0, 2).forEach((d) => edges.push([i, d[1]]));
      });
      pulses.forEach((q) => { q.e = Math.floor(Math.random() * edges.length); });
    };
    const size = () => {
      const dpr = Math.min(1.5, devicePixelRatio || 1);
      W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      linkEdges();
    };
    const sense = () => {
      pending = false;
      alpha = hero ? Math.min(1, Math.max(0, (scrollY - H * 0.35) / (H * 0.5))) : 1;
      c.style.opacity = alpha.toFixed(3); c.dataset.alpha = alpha.toFixed(3);
      const sections = [...document.querySelectorAll('main section, main .page')];
      const here = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= H * 0.5 && r.bottom > H * 0.5; });
      if (here) shape = SHAPES[here.id] || CYCLE[sections.indexOf(here) % CYCLE.length];
      c.dataset.formation = shape;
      if (isReduced()) still();
    };
    function step(snap) {
      const f = targets[shape];
      const ease = snap ? 1 : 0.05;
      net += ((shape === 'network' ? 1 : 0) - net) * ease;
      orb += ((shape === 'orbit' ? 1 : 0) - orb) * ease;
      wav += ((shape === 'wave' ? 1 : 0) - wav) * ease;
      P.forEach((p, i) => {
        const [tx, ty] = f(p, i);
        if (snap || !placed || (shape === 'rain' && ty < p.y - H * 0.5)) { p.x = tx; p.y = ty; } else { p.x += (tx - p.x) * 0.055; p.y += (ty - p.y) * 0.055; }
      });
      placed = true;
    }
    const offset = (p) => {
      const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy);
      if (d >= 150 || d < 0.01) return [p.x, p.y];
      const k = (1 - d / 150) ** 2 * 34;
      return [p.x + (dx / d) * k, p.y + (dy / d) * k];
    };
    function draw() {
      x.clearRect(0, 0, W, H);
      const pos = P.map(offset);
      if (net > 0.02) {
        x.strokeStyle = `rgba(215,219,226,${0.13 * net})`; x.lineWidth = 1; x.beginPath();
        edges.forEach(([a, b]) => { x.moveTo(pos[a][0], pos[a][1]); x.lineTo(pos[b][0], pos[b][1]); });
        x.stroke();
        pulses.forEach((q) => {
          q.k += 0.012;
          if (q.k >= 1) { const end = edges[q.e][1], next = edges.findIndex((e) => e[0] === end); q.e = next >= 0 ? next : Math.floor(Math.random() * edges.length); q.k = 0; }
          const [a, b] = edges[q.e], X = pos[a][0] + (pos[b][0] - pos[a][0]) * q.k, Y = pos[a][1] + (pos[b][1] - pos[a][1]) * q.k;
          x.fillStyle = `rgba(255,255,255,${0.14 * net})`; x.fillRect(X - 4, Y - 4, 8, 8);
          x.fillStyle = `rgba(255,255,255,${0.75 * net})`; x.fillRect(X - 1.5, Y - 1.5, 3, 3);
        });
      }
      if (orb > 0.02) {
        x.strokeStyle = `rgba(215,219,226,${0.13 * orb})`; x.lineWidth = 1;
        for (let r = 0; r < 4; r++) { const R = (0.2 + r * 0.15) * Math.min(W, H); x.beginPath(); x.ellipse(W * 0.5, H * 0.5, R * 1.25, R, 0, 0, Math.PI * 2); x.stroke(); }
      }
      if (wav > 0.02) {
        x.strokeStyle = `rgba(215,219,226,${0.16 * wav})`; x.lineWidth = 1;
        for (let band = 0; band < 3; band++) { x.beginPath(); pos.forEach(([X, Y], i) => { if (i % 3 === band) { if (i < 3) x.moveTo(X, Y); else x.lineTo(X, Y); } }); x.stroke(); }
      }
      pos.forEach(([X, Y], i) => {
        const shine = 0.26 + 0.42 * Math.max(0, Math.sin(i * 0.31 - t * 0.7)) ** 6;
        x.fillStyle = `rgba(214,218,225,${shine})`;
        x.fillRect(X, Y, 1.6, 1.6);
      });
      c.dataset.frames = frames;
    }
    const still = () => { step(true); draw(); };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (alpha === 0) return;
      t += 0.016; frames++; step(false); draw();
    };
    const run = () => {
      cancelAnimationFrame(raf);
      sense();
      if (isReduced() || document.hidden) still(); else raf = requestAnimationFrame(loop);
    };
    addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(sense); } }, { passive: true });
    if (finePointer) addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; }, { passive: true });
    addEventListener('resize', () => { size(); placed = false; run(); });
    document.addEventListener('visibilitychange', run);
    onMotionChange(run);
    c.dataset.frames = 0;
    size(); run();
  })();
})();
