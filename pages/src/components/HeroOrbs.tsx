"use client";

import { useEffect, useRef } from "react";

// The landing page's hero spheres, in miniature: a solid low-poly icosahedron
// (flat-shaded faces + dark edges, NOT see-through) that stays put and rotates,
// plus the lime wireframe ball bouncing freely off the edges and off the
// purple solid. Real 3D geometry projected onto 2D canvas — same icosahedron
// the landing builds with THREE.IcosahedronGeometry.

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  spin: number;
  /** knock-back offset (px) + its velocity — the purple "gives" on impact,
   *  then a spring pulls it home */
  ox: number;
  oy: number;
  ovx: number;
  ovy: number;
}

type V3 = [number, number, number];

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

// base icosahedron → subdivided `detail` times, midpoints pushed to the sphere
function icosahedron(detail: number): { verts: V3[]; faces: [number, number, number][] } {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts: V3[] = (
    [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ] as V3[]
  ).map(norm);
  let faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let d = 0; d < detail; d++) {
    const mid = new Map<string, number>();
    const getMid = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      let m = mid.get(key);
      if (m === undefined) {
        m = verts.length;
        verts.push(norm([
          (verts[a][0] + verts[b][0]) / 2,
          (verts[a][1] + verts[b][1]) / 2,
          (verts[a][2] + verts[b][2]) / 2,
        ]));
        mid.set(key, m);
      }
      return m;
    };
    const next: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = getMid(a, b);
      const bc = getMid(b, c);
      const ca = getMid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  return { verts, faces };
}

const GEO = icosahedron(2); // 320 faces — reads as low-poly facets, like the landing's
const TILT = 0.42; // fixed X tilt so the rotation shows poles + facets, not a flat spin

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
    // canvas spans the whole hero card — green roams it freely, purple is
    // anchored on a spring: it gives when hit, then eases back home
    const green: Orb = { x: 0.3, y: 0.35, vx: 0.004, vy: 0.0032, r: 0.17, rot: 0, spin: 0.016, ox: 0, oy: 0, ovx: 0, ovy: 0 };
    const purple: Orb = { x: 0.86, y: 0.66, vx: 0, vy: 0, r: 0.29, rot: 1.1, spin: -0.008, ox: 0, oy: 0, ovx: 0, ovy: 0 };

    // rotate unit-sphere verts, tilt, project orthographic → screen points
    const project = (o: Orb, w: number, h: number) => {
      const cx = o.x * w;
      const cy = o.y * h;
      const r = o.r * h;
      const cosY = Math.cos(o.rot);
      const sinY = Math.sin(o.rot);
      const cosX = Math.cos(TILT);
      const sinX = Math.sin(TILT);
      return GEO.verts.map(([vx, vy, vz]) => {
        const x = vx * cosY + vz * sinY;
        const z = -vx * sinY + vz * cosY;
        const y2 = vy * cosX - z * sinX;
        const z2 = vy * sinX + z * cosX;
        return { x: cx + o.ox + x * r, y: cy + o.oy + y2 * r, z: z2, nx: x, ny: y2, nz: z2 };
      });
    };

    // solid low-poly polyhedron: fill each front face with flat shading,
    // dark facet edges — matches the landing's MeshPhysicalMaterial + EdgesGeometry
    const drawSolid = (o: Orb, w: number, h: number) => {
      const pts = project(o, w, h);
      const light = norm([-0.45, -0.6, 0.75]);
      const order = GEO.faces
        .map((f, i) => ({ i, z: (pts[f[0]].z + pts[f[1]].z + pts[f[2]].z) / 3 }))
        .sort((a, b) => a.z - b.z);
      for (const { i } of order) {
        const [a, b, c] = GEO.faces[i];
        const pa = pts[a], pb = pts[b], pc = pts[c];
        // face normal from rotated unit verts
        const ux = pb.nx - pa.nx, uy = pb.ny - pa.ny, uz = pb.nz - pa.nz;
        const wx = pc.nx - pa.nx, wy = pc.ny - pa.ny, wz = pc.nz - pa.nz;
        const n = norm([uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx]);
        if (n[2] <= 0) continue; // back faces hidden — opaque sphere
        const lum = 0.42 + 0.58 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
        ctx.fillStyle = `rgb(${Math.round(58 * lum)}, ${Math.round(18 * lum)}, ${Math.round(150 * lum)})`;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.lineTo(pc.x, pc.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(6,2,18,.75)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    // lime wireframe — every edge, like the landing's wireframe ball
    const drawWire = (o: Orb, w: number, h: number) => {
      const pts = project(o, w, h);
      const r = o.r * h;
      ctx.strokeStyle = "#b1f150";
      ctx.lineWidth = Math.max(1, r * 0.02);
      for (const [a, b, c] of GEO.faces) {
        const pa = pts[a], pb = pts[b], pc = pts[c];
        ctx.globalAlpha = (pa.z + pb.z + pc.z) / 3 > 0 ? 0.9 : 0.32;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.lineTo(pc.x, pc.y);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const step = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // green roams + spins; purple holds position, rotates only.
      // spin rides the horizontal velocity so the ball rolls — the fixed
      // spin value kept turning the old way after every bounce flip.
      // vx*4 matches the old 0.016 rate at the 0.004 cruising speed.
      green.x += green.vx;
      green.y += green.vy;
      green.rot += green.vx * 4;
      purple.rot += purple.spin;

      // purple's spring: it gives when knocked, eases back to its anchor
      const STIFF = 0.16, DAMP = 0.86;
      purple.ovx += -STIFF * purple.ox;
      purple.ovy += -STIFF * purple.oy;
      purple.ovx *= DAMP;
      purple.ovy *= DAMP;
      purple.ox += purple.ovx;
      purple.oy += purple.ovy;

      // wall bounce with a small inset so the ball never clips the canvas edge
      const inset = 1.05;
      const rx = (green.r * inset * h) / w;
      const ry = green.r * inset;
      if (green.x - rx < 0 || green.x + rx > 1) green.vx *= -1;
      if (green.y - ry < 0 || green.y + ry > 1) green.vy *= -1;
      green.x = Math.min(1 - rx, Math.max(rx, green.x));
      green.y = Math.min(1 - ry, Math.max(ry, green.y));

      // green bounces off the purple polyhedron — which gives a little on
      // impact (impulse into its spring) instead of staying rigid
      const dx = (purple.x * w + purple.ox) - green.x * w;
      const dy = (purple.y * h + purple.oy) - green.y * h;
      const dist = Math.hypot(dx, dy);
      const min = (purple.r + green.r * inset) * h;
      if (dist > 0 && dist < min) {
        const nx = dx / dist;
        const ny = dy / dist;
        green.x -= (nx * (min - dist)) / w;
        green.y -= (ny * (min - dist)) / h;
        const vn = green.vx * w * nx + green.vy * h * ny;
        if (vn > 0) {
          green.vx -= (2 * vn * nx) / w;
          green.vy -= (2 * vn * ny) / h;
          // knock the purple along the hit direction — spring pulls it home
          purple.ovx += nx * vn * 0.55;
          purple.ovy += ny * vn * 0.55;
        }
      }

      drawSolid(purple, w, h);
      drawWire(green, w, h);
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
