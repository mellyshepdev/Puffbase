"use client";

import { useEffect, useRef } from "react";

// Miniature version of the landing page's hero spheres: the lime wireframe
// ball (#b1f150) bounces freely, while the purple one is a solid darker
// faceted shape — like the big icosahedron pinned at the top of the landing
// page (MeshPhysicalMaterial #6d36e8 flat-shaded + black facet outlines) —
// that stays put and only rotates.
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
    const green: Orb = { x: 0.3, y: 0.4, vx: 0.005, vy: 0.0038, r: 0.27, color: "#b1f150", rot: 0, spin: 0.016 };
    // solid purple — fixed anchor, rotates only
    const purple: Orb = { x: 0.74, y: 0.58, vx: 0, vy: 0, r: 0.3, color: "#6d36e8", rot: 1.1, spin: -0.011 };

    const facetLines = (o: Orb, cx: number, cy: number, r: number) => {
      // meridians — vertical great-circles at many rotating angles
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
    };

    const drawWireOrb = (o: Orb, w: number, h: number) => {
      const cx = o.x * w;
      const cy = o.y * h;
      const r = o.r * h;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = Math.max(1, r * 0.045);
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, r * 0.028);
      facetLines(o, cx, cy, r);
      ctx.globalAlpha = 1;
    };

    // landing page's top sphere: solid flat-shaded purple, darker toward the
    // rim, with black facet outlines pinned to the surface
    const drawSolidOrb = (o: Orb, w: number, h: number) => {
      const cx = o.x * w;
      const cy = o.y * h;
      const r = o.r * h;
      const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.08, cx, cy, r);
      grad.addColorStop(0, "#5a2fc0");
      grad.addColorStop(0.55, "#3a1a86");
      grad.addColorStop(1, "#1a0b3f");
      ctx.fillStyle = grad;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // black facet outlines, like EdgesGeometry on the landing sphere
      ctx.strokeStyle = "rgba(6,2,18,.8)";
      ctx.lineWidth = Math.max(1, r * 0.02);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      facetLines(o, cx, cy, r);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, r * 0.03);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const step = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // green roams + spins; purple holds position, rotates only
      green.x += green.vx;
      green.y += green.vy;
      green.rot += green.spin;
      purple.rot += purple.spin;

      const rx = (green.r * h) / w;
      if (green.x - rx < 0 || green.x + rx > 1) green.vx *= -1;
      if (green.y - green.r < 0 || green.y + green.r > 1) green.vy *= -1;
      green.x = Math.min(1 - rx, Math.max(rx, green.x));
      green.y = Math.min(1 - green.r, Math.max(green.r, green.y));

      // green bounces off the anchored purple sphere (infinite mass — only
      // the green ball's velocity changes)
      const dx = (purple.x - green.x) * w;
      const dy = (purple.y - green.y) * h;
      const dist = Math.hypot(dx, dy);
      const min = purple.r * h + green.r * h;
      if (dist > 0 && dist < min) {
        const nx = dx / dist;
        const ny = dy / dist;
        green.x -= (nx * (min - dist)) / w;
        green.y -= (ny * (min - dist)) / h;
        const vn = green.vx * w * nx + green.vy * h * ny;
        if (vn > 0) {
          green.vx -= (2 * vn * nx) / w;
          green.vy -= (2 * vn * ny) / h;
        }
      }

      drawSolidOrb(purple, w, h);
      drawWireOrb(green, w, h);
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
