"use client";

// Wireframe globe on a canvas: latitude and longitude lines, a tilted orbit ring and a pole axis.
// It fades and grows in, draws its lines outward from the equator, then spins up around its axis.
import { useEffect, useRef } from "react";

const DEG = Math.PI / 180;
const TILT = 0.38;
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export function Globe({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const css = getComputedStyle(document.documentElement);
    const line = css.getPropertyValue("--accent").trim() || "#1f4d3a";
    const dot = css.getPropertyValue("--highlight").trim() || "#a8e070";
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, raf = 0, visible = true;
    const start = performance.now();
    let last = start;
    let angle = -0.6;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Rotate a point on the unit sphere about the vertical axis, then tilt it toward the viewer.
    const project = (lat: number, lon: number, a: number) => {
      const cl = Math.cos(lat), x0 = cl * Math.sin(lon + a), y0 = Math.sin(lat), z0 = cl * Math.cos(lon + a);
      const y = y0 * Math.cos(TILT) - z0 * Math.sin(TILT);
      const z = y0 * Math.sin(TILT) + z0 * Math.cos(TILT);
      return { x: x0, y, z };
    };

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const intro = ease(t / 1.4);
      const spin = still ? 0 : ease((t - 0.9) / 2.2) * 0.32; // rad/s, ramps up after the lines are drawn
      angle += spin * dt;

      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.36 * (0.9 + 0.1 * intro);
      const cx = w / 2, cy = h / 2;
      ctx.lineWidth = 1;
      ctx.lineCap = "round";

      const stroke = (pts: { x: number; y: number; z: number }[], strength: number, width = 1) => {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const depth = (a.z + b.z) / 2; // -1 back … 1 front
          ctx.globalAlpha = strength * (0.1 + 0.75 * ((depth + 1) / 2)) * intro;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(cx + a.x * R, cy - a.y * R);
          ctx.lineTo(cx + b.x * R, cy - b.y * R);
          ctx.stroke();
        }
      };

      ctx.strokeStyle = line;
      // Latitudes: drawn outward from the equator.
      for (let lat = -80; lat <= 80; lat += 20) {
        const reveal = ease((t * 1.1 - Math.abs(lat) / 120) / 0.9);
        if (reveal <= 0) continue;
        const pts = [];
        const steps = Math.max(2, Math.round(72 * reveal));
        for (let i = 0; i <= steps; i++) pts.push(project(lat * DEG, (i / 72) * 2 * Math.PI, angle));
        stroke(pts, lat === 0 ? 1 : 0.7, lat === 0 ? 1.6 : 1);
      }
      // Meridians: every 20°, fanning in from the front.
      for (let lon = 0; lon < 360; lon += 20) {
        const reveal = ease((t * 1.1 - 0.25 - (lon % 180) / 400) / 0.9);
        if (reveal <= 0) continue;
        const pts = [];
        const steps = Math.max(2, Math.round(48 * reveal));
        for (let i = 0; i <= steps; i++) pts.push(project((-90 + (i / 48) * 180) * DEG, lon * DEG, angle));
        stroke(pts, 0.7);
      }

      // Orbit ring around the globe with one moving point on it.
      const ring = ease((t - 0.6) / 1.2);
      if (ring > 0) {
        const pts = [];
        for (let i = 0; i <= 96; i++) {
          const u = (i / 96) * 2 * Math.PI;
          const x0 = 1.28 * Math.cos(u), z0 = 1.28 * Math.sin(u), y0 = 0;
          const tl = 0.9; // ring tilt
          const y1 = y0 * Math.cos(tl) - z0 * Math.sin(tl), z1 = y0 * Math.sin(tl) + z0 * Math.cos(tl);
          const y = y1 * Math.cos(TILT) - z1 * Math.sin(TILT), z = y1 * Math.sin(TILT) + z1 * Math.cos(TILT);
          pts.push({ x: x0, y, z });
        }
        ctx.strokeStyle = line;
        const keep = Math.round(pts.length * ring);
        stroke(pts.slice(0, Math.max(2, keep)), 0.55);

        const u = t * 0.5 + 1;
        const x0 = 1.28 * Math.cos(u), z0 = 1.28 * Math.sin(u);
        const tl = 0.9;
        const y1 = -z0 * Math.sin(tl), z1 = z0 * Math.cos(tl);
        const y = y1 * Math.cos(TILT) - z1 * Math.sin(TILT);
        ctx.globalAlpha = ring;
        ctx.fillStyle = dot;
        ctx.beginPath(); ctx.arc(cx + x0 * R, cy - y * R, 5, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.globalAlpha = ring; ctx.stroke();
      }

      // Poles.
      ctx.fillStyle = line;
      for (const lat of [90, -90]) {
        const p = project(lat * DEG, 0, angle);
        ctx.globalAlpha = intro * (p.z > -0.05 ? 0.9 : 0.25);
        ctx.beginPath(); ctx.arc(cx + p.x * R, cy - p.y * R, 2.5, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!still && visible) raf = requestAnimationFrame(frame);
    };

    resize();
    const ro = new ResizeObserver(() => { resize(); if (still) frame(start + 5000); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !still) { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    io.observe(canvas);

    if (still) frame(start + 5000); else raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return <canvas ref={ref} role="img" aria-label="Rotating wireframe globe" className={className} />;
}
