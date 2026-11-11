"use client";

interface EvalGraphProps {
  /** White's win probability (0-100) per position; index 0 is the start. */
  winPercents: readonly number[];
  selected: number;
  onSelect: (index: number) => void;
}

const WIDTH = 600;
const HEIGHT = 90;

/** Small SVG chart of the game. The shaded area is White's share of the winning chances. */
export function EvalGraph({ winPercents, selected, onSelect }: EvalGraphProps) {
  if (winPercents.length < 2) return null;
  const step = WIDTH / (winPercents.length - 1);
  const points = winPercents.map((win, index) => `${(index * step).toFixed(1)},${(HEIGHT - (win / 100) * HEIGHT).toFixed(1)}`);
  const area = `0,${HEIGHT} ${points.join(" ")} ${WIDTH},${HEIGHT}`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-24 w-full cursor-pointer rounded-md border"
      style={{ borderColor: "var(--border)", background: "#27272a" }}
      role="img"
      aria-label="Evaluation graph: higher means better for White"
      preserveAspectRatio="none"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        onSelect(Math.max(0, Math.min(winPercents.length - 1, Math.round(ratio * (winPercents.length - 1)))));
      }}
    >
      <polygon points={area} fill="#e4e4e7" />
      <line x1="0" x2={WIDTH} y1={HEIGHT / 2} y2={HEIGHT / 2} stroke="#71717a" strokeDasharray="4 4" strokeWidth="1" />
      <line x1={selected * step} x2={selected * step} y1="0" y2={HEIGHT} stroke="#4ade80" strokeWidth="2" />
    </svg>
  );
}
