// Cursor-reactive background: a spotlight that follows the mouse, plus a field of
// glowing particles that drift down and are pushed away from the cursor, with
// faint lines drawn between nearby particles. Visual only; tweak CONFIG below.
(() => {
  const CONFIG = {
    density: 0.00012,    // particles per pixel of screen area
    radius: 170,         // cursor influence radius (px)
    push: 0.9,           // how strongly the cursor repels particles
    link: 120,           // max distance for connecting lines
    fall: [0.15, 0.7],   // downward drift speed range
    colors: ["120,170,255", "90,230,255", "170,150,255"],
  };
  const canvas = document.getElementById("shower");
  const spot = document.querySelector(".bg-spot");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w, h, dpr, ps = [];
  const m = { x: -9999, y: -9999, sx: -9999, sy: -9999 };
  const rand = (a, b) => a + Math.random() * (b - a);

  function make(top) {
    const z = Math.random();
    return { x: rand(0, w), y: top ? -10 : rand(0, h), vx: rand(-.15, .15), vy: CONFIG.fall[0] + (CONFIG.fall[1] - CONFIG.fall[0]) * z,
      r: 0.8 + z * 1.8, a: 0.25 + z * 0.65, c: CONFIG.colors[(Math.random() * 3) | 0], ox: 0, oy: 0 };
  }
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ps = Array.from({ length: Math.round(w * h * CONFIG.density) }, () => make(false));
  }
  addEventListener("resize", resize);
  addEventListener("pointermove", e => { m.x = e.clientX; m.y = e.clientY; });
  addEventListener("pointerleave", () => { m.x = m.y = -9999; });

  function frame() {
    m.sx += (m.x - m.sx) * 0.12; m.sy += (m.y - m.sy) * 0.12;
    if (spot) spot.style.background = `radial-gradient(520px circle at ${m.sx}px ${m.sy}px, rgba(70,130,255,.20), rgba(60,200,255,.07) 45%, transparent 70%)`;
    ctx.clearRect(0, 0, w, h);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy;
      const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
      if (d < CONFIG.radius) { const f = (1 - d / CONFIG.radius) * CONFIG.push; p.ox += (dx / (d || 1)) * f * 3; p.oy += (dy / (d || 1)) * f * 3; }
      p.ox *= 0.92; p.oy *= 0.92;                       // ease back after being pushed
      if (p.y > h + 10) Object.assign(p, make(true));
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
      p.dx = p.x + p.ox; p.dy = p.y + p.oy;
    }
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      ctx.fillStyle = `rgba(${p.c},${p.a})`; ctx.shadowColor = `rgba(${p.c},.8)`; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(p.dx, p.dy, p.r, 0, 6.283); ctx.fill();
      ctx.shadowBlur = 0;
      for (let j = i + 1; j < ps.length; j++) {
        const q = ps[j], l = Math.hypot(p.dx - q.dx, p.dy - q.dy);
        if (l < CONFIG.link) {
          const near = Math.hypot((p.dx + q.dx) / 2 - m.sx, (p.dy + q.dy) / 2 - m.sy) < CONFIG.radius * 1.4;
          ctx.strokeStyle = `rgba(${p.c},${(1 - l / CONFIG.link) * (near ? 0.5 : 0.12)})`;
          ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(p.dx, p.dy); ctx.lineTo(q.dx, q.dy); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(frame);
  }
  resize();
  if (!reduce) requestAnimationFrame(frame);
})();
