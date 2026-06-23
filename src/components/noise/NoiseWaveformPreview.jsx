import { useEffect, useRef } from "react";

const W = 280;
const H = 44;
const MID = H / 2;

function sampleY(type, x, t) {
  if (type === "baseline") {
    return MID + 14 * Math.sin(((x + t * 22) / W) * Math.PI * 1.6);
  }
  if (type === "powerline") {
    return MID + 12 * Math.sin(((x + t * 55) / W) * Math.PI * 28);
  }
  const sx = (x + t * 35) / W;
  return (
    MID +
    10 *
      (Math.sin(sx * Math.PI * 38 + t * 2.4) * 0.38 +
        Math.sin(sx * Math.PI * 19 + t * 4.1) * 0.32 +
        Math.sin(sx * Math.PI * 71 + t * 5.8) * 0.3)
  );
}

function buildPath(type, t) {
  const pts = [];
  for (let x = 0; x <= W; x += 1) {
    pts.push(`${x},${sampleY(type, x, t).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")}`;
}

export function NoiseWaveformPreview({ type, color }) {
  const pathRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    let frameId = 0;

    const animate = (now) => {
      if (!startRef.current) startRef.current = now;
      const t = (now - startRef.current) / 1000;
      pathRef.current?.setAttribute("d", buildPath(type, t));
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameId);
      startRef.current = null;
    };
  }, [type]);

  return (
    <div>
      <p className="noise-preview-label">WAVEFORM PREVIEW</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="noise-preview-svg"
        aria-hidden="true"
      >
        <path
          ref={pathRef}
          d={buildPath(type, 0)}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
