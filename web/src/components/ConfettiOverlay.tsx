"use client";

import * as React from "react";

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rotV: number;
  color: string;
  w: number; h: number;
  opacity: number;
  shape: "rect" | "circle";
};

// Brand-aware confetti colours: primary teal, amber, blue, purple, green
const COLORS = ["#00D196", "#F5A623", "#60A5FA", "#A78BFA", "#34D399", "#FCD34D", "#F472B6"];

function makeParticles(canvas: HTMLCanvasElement): Particle[] {
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.45;
  return Array.from({ length: 120 }, () => ({
    x:    cx + (Math.random() - 0.5) * 160,
    y:    cy,
    vx:   (Math.random() - 0.5) * 10,
    vy:   -(Math.random() * 14 + 4),
    rot:  Math.random() * 360,
    rotV: (Math.random() - 0.5) * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    w:    8 + Math.random() * 7,
    h:    4 + Math.random() * 4,
    opacity: 1,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));
}

/**
 * Full-screen canvas overlay that fires confetti particles when `trigger`
 * flips true. Cleans itself up automatically once all particles have faded.
 * Pure canvas — no extra libraries.
 */
export function ConfettiOverlay({ trigger }: { trigger: boolean }) {
  const canvasRef  = React.useRef<HTMLCanvasElement>(null);
  const particles  = React.useRef<Particle[]>([]);
  const rafRef     = React.useRef<number | null>(null);
  const triggeredRef = React.useRef(false);

  React.useEffect(() => {
    if (!trigger || triggeredRef.current) return;
    triggeredRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    particles.current = makeParticles(canvas);

    function tick() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      particles.current = particles.current.filter((p) => p.opacity > 0.02);

      for (const p of particles.current) {
        p.vy      += 0.3;                   // gravity
        p.vx      *= 0.99;                  // air drag
        p.x       += p.vx;
        p.y       += p.vy;
        p.rot     += p.rotV;
        p.opacity -= 0.007;

        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rot * Math.PI) / 180);
        ctx!.globalAlpha = Math.max(0, p.opacity);
        ctx!.fillStyle   = p.color;

        if (p.shape === "circle") {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx!.restore();
      }

      if (particles.current.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        triggeredRef.current = false;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[200]"
      aria-hidden
    />
  );
}
