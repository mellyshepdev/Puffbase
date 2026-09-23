"use client";

import { useEffect, useRef } from "react";

// Miniature version of the landing page's two wireframe bouncing balls
// (lime #b1f150 + purple #6d36e8 icosahedron spheres), drawn as rotating
// wireframe spheres on a small canvas inside the hero card.
interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  rot: number;
  spin: number;
}

export function HeroOrbs() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // positions/velocities in fractions of canvas size; r as fraction of height
    const orbs: Orb[] = [
      { x: 0.3, y: 0.4, vx: 0.0018, vy: 0.0012, r: 0.27, color: "#b1f150", rot: 0, spin: 0.016 },
      { x: 0.72, y: 0.55, vx: -0.0014, vy: 0.0016, r: 0.27, color: "#8b4dff", rot: 1.1, spin: -0.013 },
    ];

    const drawOrb = (o: Orb, w: number, h: number) => {
      const cx = o.x * w;
      const cy = o.y * h;
      const r = o.r * h;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = Math.max(1, r * 0.045);
      ctx.globalAlpha = 0.9;
      // outer rim
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, r * 0.028);
      // meridians — vertical great-circles at many rotating angles, like the
      // landing page's icosahedron facets
      for (let i = 0; i < 8; i++) {
        const a = o.rot + (i * Math.PI) / 8;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * Math.abs(Math.cos(a)), r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // parallels — horizontal rings at several latitudes, tilted by the spin
      const tilt = 0.28 + Math.sin(o.rot * 0.6) * 0.14;
      for (let j = -3; j <= 3; j++) {
        if (j === 0) continue;
        const lat = (j * Math.PI) / 8;
        const py = cy - r * Math.sin(lat) * Math.cos(tilt);
        const pr = r * Math.cos(lat);
        ctx.beginPath();
        ctx.ellipse(cx, py, pr, pr * Math.abs(Math.sin(tilt)) + r * 0.04, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // equator, slightly stronger
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * Math.abs(Math.sin(tilt)) + r * 0.05, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const step = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const o of orbs) {
        o.x += o.vx;
        o.y += o.vy;
        o.rot += o.spin;
        const rx = (o.r * h) / w;
        if (o.x - rx < 0 || o.x + rx > 1) o.vx *= -1;
        if (o.y - o.r < 0 || o.y + o.r > 1) o.vy *= -1;
        o.x = Math.min(1 - rx, Math.max(rx, o.x));
        o.y = Math.min(1 - o.r, Math.max(o.r, o.y));
      }

      // elastic bounce off each other
      const [a, b] = orbs;
      const dx = (b.x - a.x) * w;
      const dy = (b.y - a.y) * h;
      const dist = Math.hypot(dx, dy);
      const min = a.r * h + b.r * h;
      if (dist > 0 && dist < min) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (min - dist) / 2;
        a.x -= (nx * overlap) / w;
        a.y -= (ny * overlap) / h;
        b.x += (nx * overlap) / w;
        b.y += (ny * overlap) / h;
        const av = a.vx * w * nx + a.vy * h * ny;
        const bv = b.vx * w * nx + b.vy * h * ny;
        const d = bv - av;
        a.vx += (d * nx) / w;
        a.vy += (d * ny) / h;
        b.vx -= (d * nx) / w;
        b.vy -= (d * ny) / h;
      }

      for (const o of orbs) drawOrb(o, w, h);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="hero-orbs-canvas" aria-hidden="true" />;
}
