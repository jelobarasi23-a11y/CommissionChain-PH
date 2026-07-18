"use client";

import * as React from "react";
import { FileText, Lock, HandCoins } from "lucide-react";

type Step = {
  id: string;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  count: number;
  color: string;
  glow: string;
  ring: string;
  active: boolean;
};

type Particle = { id: number; progress: number; speed: number; segment: number };

const SEGMENTS = 2; // 3 nodes → 2 connecting segments
let pid = 0;

/**
 * Animated SVG pipeline showing the referral lifecycle: Submit → Approve →
 * Claim. Nodes glow when they have live data; a particle flows along the
 * path every few seconds to reinforce the sense of real activity.
 */
export function PipelineVisualizer({
  pending,
  approved,
  claimed,
}: {
  pending: number;
  approved: number;
  claimed: number;
}) {
  const [particles, setParticles] = React.useState<Particle[]>([]);

  // Spawn a new particle every 2.5 s
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const seg = Math.floor(Math.random() * SEGMENTS);
      setParticles((prev) =>
        [...prev.slice(-8), { id: ++pid, progress: 0, speed: 0.008 + Math.random() * 0.006, segment: seg }]
      );
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  // Animate particles
  React.useEffect(() => {
    if (particles.length === 0) return;
    let raf: number;
    const tick = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + p.speed }))
          .filter((p) => p.progress < 1)
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [particles.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps: Step[] = [
    {
      id: "submit", icon: FileText,
      label: "Submit", sublabel: "Referral recorded on-chain",
      count: pending + approved + claimed,
      color: "#00D196", glow: "drop-shadow(0 0 10px #00D196aa)",
      ring: "stroke-primary", active: true,
    },
    {
      id: "approve", icon: Lock,
      label: "Approve", sublabel: "Commission moves into escrow",
      count: approved + claimed,
      color: "#F5A623", glow: "drop-shadow(0 0 10px #F5A623aa)",
      ring: "stroke-[hsl(var(--gold))]", active: approved + claimed > 0,
    },
    {
      id: "claim", icon: HandCoins,
      label: "Claim", sublabel: "Paid direct to agent wallet",
      count: claimed,
      color: "#00D196", glow: "drop-shadow(0 0 12px #00D196cc)",
      ring: "stroke-primary", active: claimed > 0,
    },
  ];

  // Node cx positions for a 3-node layout in a 560-wide viewBox
  const NODE_CX = [80, 280, 480];
  const CY = 80;

  // Interpolate a particle's (x,y) along one of the two path segments
  function particlePos(seg: number, t: number): [number, number] {
    const x1 = NODE_CX[seg] + 36;
    const x2 = NODE_CX[seg + 1] - 36;
    return [x1 + (x2 - x1) * t, CY];
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 560 160"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full min-w-[360px] max-w-2xl mx-auto"
        aria-label="Referral pipeline: Submit → Approve → Claim"
      >
        {/* Connecting lines */}
        {[0, 1].map((seg) => (
          <line
            key={seg}
            x1={NODE_CX[seg] + 36} y1={CY}
            x2={NODE_CX[seg + 1] - 36} y2={CY}
            stroke="hsl(var(--edge-bright))"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        ))}

        {/* Animated particles */}
        {particles.map((p) => {
          const [px, py] = particlePos(p.segment, p.progress);
          return (
            <circle key={p.id} cx={px} cy={py} r="4" fill={steps[p.segment].color} opacity="0.85">
              <animate attributeName="opacity" values="0;0.9;0" dur="0.6s" begin="0s" />
            </circle>
          );
        })}

        {/* Step nodes */}
        {steps.map((step, i) => {
          const cx = NODE_CX[i];
          const Icon = step.icon;
          return (
            <g key={step.id}>
              {/* Outer glow ring — only when active */}
              {step.active && (
                <circle
                  cx={cx} cy={CY} r="38"
                  fill="none"
                  stroke={step.color}
                  strokeWidth="1"
                  opacity="0.2"
                  className="animate-pulse"
                />
              )}
              {/* Main circle */}
              <circle
                cx={cx} cy={CY} r="30"
                fill={step.active ? `${step.color}18` : "hsl(var(--surface-raised))"}
                stroke={step.active ? step.color : "hsl(var(--edge))"}
                strokeWidth={step.active ? "1.5" : "1"}
                style={step.active ? { filter: step.glow } : undefined}
                className="transition-all duration-500"
              />
              {/* Icon — rendered as foreignObject so we can use Lucide */}
              <foreignObject x={cx - 13} y={CY - 13} width="26" height="26">
                <Icon
                  style={{ color: step.active ? step.color : "hsl(var(--muted-foreground))", width: 26, height: 26 }}
                />
              </foreignObject>
              {/* Count badge */}
              {step.count > 0 && (
                <g>
                  <circle cx={cx + 22} cy={CY - 22} r="10" fill={step.color} />
                  <text
                    x={cx + 22} y={CY - 18}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="hsl(var(--night))"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {step.count > 99 ? "99+" : step.count}
                  </text>
                </g>
              )}
              {/* Label below */}
              <text
                x={cx} y={CY + 46}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="hsl(var(--foreground))"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                {step.label}
              </text>
              <text
                x={cx} y={CY + 60}
                textAnchor="middle"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
                fontFamily="Inter, sans-serif"
              >
                {step.sublabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
