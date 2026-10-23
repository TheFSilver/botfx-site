/* botfx — interactions. Vanilla, ~4 Ko gzip. Tout se dégrade proprement sans JS. */
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
  });

  /* ---------- header ---------- */
  const top = document.querySelector('.top');
  const onScroll = () => top && top.classList.toggle('is-scrolled', scrollY > 24);
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

  /* ---------- hero : sphère de points argentés ---------- */
  const canvas = document.querySelector('[data-hero-canvas]');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const N = innerWidth < 700 ? 900 : 1700;
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
      pts.push([Math.cos(th) * rad, y, Math.sin(th) * rad, Math.random()]);
    }
    let W = 0, H = 0, dpr = 1, t = 0, raf = 0, visible = true;
    let tx = 0, ty = 0, mx = 0, my = 0;
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    if (finePointer) addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5); ty = (e.clientY / innerHeight - 0.5);
    }, { passive: true });

    function draw() {
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      ctx.clearRect(0, 0, W, H);
      const small = W < 760;
      const R = small ? Math.min(W * 0.46, H * 0.2) : Math.min(W, H) * 0.34;
      const cx = small ? W * 0.5 : W * 0.74, cy = small ? H * 0.22 : H * 0.5;
      const ay = t * 0.12 + mx * 0.9, ax = 0.32 + my * 0.6;
      const sy = Math.sin(ay), cyy = Math.cos(ay), sx = Math.sin(ax), cxx = Math.cos(ax);
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        const wob = 1 + 0.06 * Math.sin(p[1] * 6 + t * 0.9 + p[3] * 2) + 0.03 * Math.sin(p[0] * 9 - t * 0.7);
        let x = p[0] * wob, y = p[1] * wob, z = p[2] * wob;
        let x1 = x * cyy - z * sy, z1 = x * sy + z * cyy;
        let y1 = y * cxx - z1 * sx, z2 = y * sx + z1 * cxx;
        const persp = 2.6 / (2.6 + z2);
        const px = cx + x1 * R * persp, py = cy + y1 * R * persp;
        const depth = (1 - z2) * 0.5;
        const a = 0.14 + depth * 0.86;
        ctx.fillStyle = `rgba(${215 + depth * 40 | 0},${218 + depth * 37 | 0},${224 + depth * 31 | 0},${a})`;
        const s = (0.7 + depth * 1.6) * persp;
        ctx.fillRect(px, py, s, s);
      }
      /* anneau orbital */
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.45, R * 0.42, -0.35 + mx * 0.3, 0, Math.PI * 2); ctx.stroke();
      const o = t * 0.5, ox = cx + Math.cos(o) * R * 1.45 * Math.cos(-0.35 + mx * 0.3) - Math.sin(o) * R * 0.42 * Math.sin(-0.35 + mx * 0.3);
      const oy = cy + Math.cos(o) * R * 1.45 * Math.sin(-0.35 + mx * 0.3) + Math.sin(o) * R * 0.42 * Math.cos(-0.35 + mx * 0.3);
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(ox, oy, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    const loop = () => { t += 0.016; draw(); raf = requestAnimationFrame(loop); };
    const run = () => {
      cancelAnimationFrame(raf);
      if (!isReduced() && visible && !document.hidden) raf = requestAnimationFrame(loop); else draw();
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }).observe(canvas);
    document.addEventListener('visibilitychange', run);
    onMotionChange(run);
    addEventListener('resize', resize);
    resize(); run();
  }
})();
