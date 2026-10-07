"use client";

import { useEffect, useRef } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  pulse: number;
}

export function Neural3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      // Normalized from -1 to 1
      mouseRef.current.targetX = (e.clientX / width - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    // Generate 3D point cloud
    const pointCount = 95;
    const points: Point3D[] = [];
    const spreadX = width * 1.1;
    const spreadY = height * 1.1;
    const spreadZ = 700;

    for (let i = 0; i < pointCount; i++) {
      points.push({
        x: (Math.random() - 0.5) * spreadX,
        y: (Math.random() - 0.5) * spreadY,
        z: (Math.random() - 0.5) * spreadZ,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        vz: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.8 + 0.8,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Geodesic 3D Core Ring Nodes
    const coreNodesCount = 36;
    const coreRadius = Math.min(width, height) * 0.22;
    const coreRings: Array<{ radius: number; tiltX: number; tiltY: number; speed: number; angle: number }> = [
      { radius: coreRadius * 0.85, tiltX: 0.8, tiltY: 0.2, speed: 0.007, angle: 0 },
      { radius: coreRadius * 1.05, tiltX: -0.5, tiltY: 0.7, speed: -0.005, angle: Math.PI / 3 },
      { radius: coreRadius * 1.22, tiltX: 0.3, tiltY: -0.9, speed: 0.003, angle: (Math.PI * 2) / 3 },
    ];

    let animId: number;
    let cameraAngleX = 0;
    let cameraAngleY = 0;
    const fov = 750;

    const render = () => {
      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      // Gentle camera orbit with mouse influence
      cameraAngleY = mouseRef.current.x * 0.35;
      cameraAngleX = -mouseRef.current.y * 0.25;

      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height * 0.48; // Centered near hero title

      const cosY = Math.cos(cameraAngleY);
      const sinY = Math.sin(cameraAngleY);
      const cosX = Math.cos(cameraAngleX);
      const sinX = Math.sin(cameraAngleX);

      // Project function for 3D coordinates
      const project = (x: number, y: number, z: number) => {
        // Rotate around Y
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        // Rotate around X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const distance = fov + z2;
        if (distance <= 20) return null;

        const scale = fov / distance;
        return {
          px: cx + x1 * scale,
          py: cy + y2 * scale,
          scale,
          z: z2,
        };
      };

      // ── 1. Draw 3D Core Gyroscopic Rings ──
      coreRings.forEach((ring) => {
        ring.angle += ring.speed;
        const pts: Array<{ px: number; py: number; alpha: number }> = [];

        for (let j = 0; j <= coreNodesCount; j++) {
          const theta = (j / coreNodesCount) * Math.PI * 2 + ring.angle;
          // Initial circle in X-Z plane
          let rx = Math.cos(theta) * ring.radius;
          let ry = Math.sin(theta) * ring.radius * 0.3;
          let rz = Math.sin(theta) * ring.radius;

          // Rotate by ring tilt
          const ry1 = ry * Math.cos(ring.tiltX) - rz * Math.sin(ring.tiltX);
          const rz1 = ry * Math.sin(ring.tiltX) + rz * Math.cos(ring.tiltX);
          const rx2 = rx * Math.cos(ring.tiltY) + rz1 * Math.sin(ring.tiltY);
          const rz2 = -rx * Math.sin(ring.tiltY) + rz1 * Math.cos(ring.tiltY);

          const proj = project(rx2, ry1, rz2);
          if (proj) {
            const depthAlpha = Math.max(0.04, Math.min(0.28, (proj.z + 400) / 800));
            pts.push({ px: proj.px, py: proj.py, alpha: depthAlpha });
          }
        }

        if (pts.length > 2) {
          ctx.beginPath();
          ctx.moveTo(pts[0].px, pts[0].py);
          for (let k = 1; k < pts.length; k++) {
            ctx.lineTo(pts[k].px, pts[k].py);
          }
          ctx.closePath();
          ctx.strokeStyle = isLight ? "rgba(59, 89, 152, 0.18)" : "rgba(123, 147, 176, 0.16)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Highlight dot moving on ring
          const leadIdx = Math.floor((Date.now() / 70) % pts.length);
          const leadPt = pts[leadIdx];
          if (leadPt) {
            ctx.beginPath();
            ctx.arc(leadPt.px, leadPt.py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = isLight ? "rgba(59, 89, 152, 0.65)" : "rgba(192, 200, 212, 0.8)";
            ctx.shadowColor = isLight ? "rgba(59, 89, 152, 0.5)" : "rgba(123, 147, 176, 0.7)";
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      // ── 2. Update and project cloud particles ──
      const projectedPoints: Array<{
        px: number;
        py: number;
        scale: number;
        z: number;
        alpha: number;
        size: number;
      }> = [];

      points.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.pulse += 0.02;

        // Wrap around bounds
        const halfW = spreadX / 2;
        const halfH = spreadY / 2;
        const halfZ = spreadZ / 2;

        if (p.x < -halfW) p.x = halfW;
        if (p.x > halfW) p.x = -halfW;
        if (p.y < -halfH) p.y = halfH;
        if (p.y > halfH) p.y = -halfH;
        if (p.z < -halfZ) p.z = halfZ;
        if (p.z > halfZ) p.z = -halfZ;

        const proj = project(p.x, p.y, p.z);
        if (proj) {
          const depthRatio = Math.max(0.1, Math.min(1, (proj.z + halfZ) / spreadZ));
          projectedPoints.push({
            px: proj.px,
            py: proj.py,
            scale: proj.scale,
            z: proj.z,
            alpha: depthRatio,
            size: p.size * (1 + Math.sin(p.pulse) * 0.25),
          });
        }
      });

      // ── 3. Draw 3D connection filaments ──
      const maxConnectDist = 140;
      for (let i = 0; i < projectedPoints.length; i++) {
        const p1 = projectedPoints[i];
        for (let j = i + 1; j < projectedPoints.length; j++) {
          const p2 = projectedPoints[j];
          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const d = Math.sqrt(dx * dx + dy * dy);

          if (d < maxConnectDist) {
            const depthDiff = Math.abs(p1.z - p2.z);
            if (depthDiff < 250) {
              const alpha = (1 - d / maxConnectDist) * 0.16 * p1.alpha;
              ctx.beginPath();
              ctx.moveTo(p1.px, p1.py);
              ctx.lineTo(p2.px, p2.py);
              ctx.strokeStyle = isLight
                ? `rgba(59, 89, 152, ${alpha})`
                : `rgba(123, 147, 176, ${alpha})`;
              ctx.lineWidth = 0.6;
              ctx.stroke();
            }
          }
        }
      }

      // ── 4. Draw projected points ──
      projectedPoints.forEach((pt) => {
        const r = pt.size * pt.scale;
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, Math.max(0.5, r), 0, Math.PI * 2);

        if (isLight) {
          ctx.fillStyle = `rgba(59, 89, 152, ${pt.alpha * 0.65})`;
        } else {
          ctx.fillStyle = `rgba(192, 200, 212, ${pt.alpha * 0.75})`;
        }
        ctx.fill();

        // Subtle specular glow on close particles
        if (pt.scale > 1.1) {
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, r * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = isLight
            ? `rgba(59, 89, 152, ${pt.alpha * 0.08})`
            : `rgba(123, 147, 176, ${pt.alpha * 0.12})`;
          ctx.fill();
        }
      });

      // ── 5. Center Ambient Glow (Soft 3D Atmospheric Fog) ──
      const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(width, height) * 0.42);
      if (isLight) {
        glowGrad.addColorStop(0, "rgba(59, 89, 152, 0.08)");
        glowGrad.addColorStop(0.5, "rgba(90, 122, 160, 0.03)");
        glowGrad.addColorStop(1, "rgba(246, 248, 251, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(59, 89, 152, 0.14)");
        glowGrad.addColorStop(0.5, "rgba(27, 44, 82, 0.05)");
        glowGrad.addColorStop(1, "rgba(7, 7, 10, 0)");
      }
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-1000"
    />
  );
}
