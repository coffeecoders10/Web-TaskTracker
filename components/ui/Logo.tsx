import type { SVGProps } from "react";

/**
 * Onward mark: two stacked chevrons ("keep moving forward") on a rounded tile.
 * Colours come from the design tokens, so it follows any palette change.
 */
export function LogoMark({
  size = 40,
  ...rest
}: { size?: number } & Omit<SVGProps<SVGSVGElement>, "width" | "height">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <rect width="40" height="40" rx="11" style={{ fill: "var(--accent)" }} />
      <g
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: "var(--accent-ink)" }}
      >
        <path d="M12.5 11.5L21 20l-8.5 8.5" opacity="0.4" />
        <path d="M20.5 11.5L29 20l-8.5 8.5" />
      </g>
    </svg>
  );
}
