import styles from "./brand-art.module.css";

const CELL = 80;
const COLS = 5;

type Shape = "quarter" | "half" | "tri" | "circle" | "square";
type Tone = "tone1" | "tone2" | "tone3" | "tone4" | "solid";

/**
 * One flat composition: a staircase that climbs left to right ("onward"),
 * one cell taller per column, bottom-aligned on a 5x5 grid. `rot` turns a
 * shape in 90deg steps around its cell.
 */
const CELLS: { c: number; r: number; shape: Shape; tone: Tone; rot?: number }[] = [
  { c: 0, r: 0, shape: "quarter", tone: "tone3" },

  { c: 1, r: 0, shape: "square", tone: "tone4" },
  { c: 1, r: 1, shape: "quarter", tone: "tone1", rot: 270 },

  { c: 2, r: 0, shape: "quarter", tone: "tone1", rot: 90 },
  { c: 2, r: 1, shape: "tri", tone: "tone2" },
  { c: 2, r: 2, shape: "half", tone: "tone3" },

  { c: 3, r: 0, shape: "half", tone: "tone3", rot: 270 },
  { c: 3, r: 1, shape: "quarter", tone: "tone2", rot: 180 },
  { c: 3, r: 2, shape: "square", tone: "tone4" },
  { c: 3, r: 3, shape: "tri", tone: "tone1", rot: 90 },

  { c: 4, r: 0, shape: "tri", tone: "tone2", rot: 180 },
  { c: 4, r: 1, shape: "half", tone: "tone1", rot: 90 },
  { c: 4, r: 2, shape: "quarter", tone: "tone3", rot: 270 },
  { c: 4, r: 3, shape: "square", tone: "tone4" },
  { c: 4, r: 4, shape: "circle", tone: "solid" },
];

/** Path/element for a shape drawn in a CELL x CELL box at the origin. */
function renderShape(shape: Shape, className: string) {
  const h = CELL / 2;
  switch (shape) {
    case "quarter":
      return <path className={className} d={`M0 0H${CELL}A${CELL} ${CELL} 0 0 1 0 ${CELL}z`} />;
    case "half":
      return <path className={className} d={`M0 ${CELL}A${h} ${h} 0 0 1 ${CELL} ${CELL}z`} />;
    case "tri":
      return <path className={className} d={`M0 ${CELL}L${CELL} ${CELL}L${CELL} 0z`} />;
    case "circle":
      return <circle className={className} cx={h} cy={h} r={h * 0.8} />;
    case "square":
      return <rect className={className} width={CELL} height={CELL} />;
  }
}

/** The brand pattern. Position and size come from the caller's `className`. */
export function BrandArt({ className }: { className?: string }) {
  const size = CELL * COLS;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {CELLS.map(({ c, r, shape, tone, rot = 0 }) => {
        const x = c * CELL;
        const y = size - (r + 1) * CELL;
        return (
          <g key={`${c}-${r}`} transform={`translate(${x} ${y}) rotate(${rot} ${CELL / 2} ${CELL / 2})`}>
            {renderShape(shape, styles[tone])}
          </g>
        );
      })}
    </svg>
  );
}
