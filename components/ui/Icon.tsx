import type { SVGProps } from "react";

/** One consistent set: 20px grid, 1.6 stroke, round caps. */
const PATHS = {
  check: "M4.5 10.5l3.5 3.5 7.5-8",
  plus: "M10 4.5v11M4.5 10h11",
  more: "M5 10h.01M10 10h.01M15 10h.01",
  chevron: "M7.5 5l5 5-5 5",
  close: "M5.5 5.5l9 9M14.5 5.5l-9 9",
  shuffle:
    "M3.5 6h2.2c3.6 0 4.6 8 8.2 8h2.6M3.5 14h2.2c1.2 0 2-.9 2.8-2M11.6 8c.8-1.2 1.6-2 2.8-2h1.9M14.5 3.5L17 6l-2.5 2.5M14.5 11.5L17 14l-2.5 2.5",
  trash: "M4.5 6h11M8 6V4.5h4V6M6 6l.6 9.5h6.8L14 6M8.5 9v4M11.5 9v4",
  edit: "M12.5 4.5l3 3L7 16H4v-3l8.5-8.5z",
  up: "M10 15.5v-11M5.5 9L10 4.5 14.5 9",
  down: "M10 4.5v11M5.5 11L10 15.5 14.5 11",
  move: "M4 10h12M12 6l4 4-4 4",
  today: "M4 5.5h12M4 10h12M4 14.5h7",
  list: "M4.5 5.5h.01M8 5.5h8M4.5 10h.01M8 10h8M4.5 14.5h.01M8 14.5h8",
  tree: "M5 4.5v11M5 7.5h4M5 12.5h4M11 6h4.5M11 14h4.5",
  repeat: "M5 8.5V8a3 3 0 013-3h5.5M11.5 3l2 2-2 2M15 11.5v.5a3 3 0 01-3 3H6.5M8.5 17l-2-2 2-2",
  gear: "M8.46 3.79L8.69 2.11L11.31 2.11L11.54 3.79L13.3 4.52L14.65 3.49L16.51 5.35L15.48 6.7L16.21 8.46L17.89 8.69L17.89 11.31L16.21 11.54L15.48 13.3L16.51 14.65L14.65 16.51L13.3 15.48L11.54 16.21L11.31 17.89L8.69 17.89L8.46 16.21L6.7 15.48L5.35 16.51L3.49 14.65L4.52 13.3L3.79 11.54L2.11 11.31L2.11 8.69L3.79 8.46L4.52 6.7L3.49 5.35L5.35 3.49L6.7 4.52zM12.6 10a2.6 2.6 0 11-5.2 0 2.6 2.6 0 015.2 0z",
  sun: "M10 13a3 3 0 100-6 3 3 0 000 6zM10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4",
  bookmark: "M6 4.5h8v11l-4-3-4 3z",
  chart: "M5 15.5v-5M10 15.5v-10M15 15.5v-7",
  refresh: "M15.5 10a5.5 5.5 0 11-1.8-4.1M15.5 3.5v3h-3",
  collapse: "M5.5 4.5L10 9l4.5-4.5M5.5 15.5L10 11l4.5 4.5",
  expand: "M5.5 8.5L10 4l4.5 4.5M5.5 11.5L10 16l4.5-4.5",
  logout: "M8 4.5H5.5a1 1 0 00-1 1v9a1 1 0 001 1H8M12 6.5L15.5 10 12 13.5M15.5 10H8",
  undo: "M7.5 4.5L4 8l3.5 3.5M4.5 8H12a3.5 3.5 0 010 7H8",
  eye: "M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10zM10 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z",
  eyeOff:
    "M3.5 3.5l13 13M8.2 5c.6-.3 1.2-.5 1.8-.5 5 0 8 5.5 8 5.5s-.8 1.4-2.2 2.8M5.8 6.6C3.7 8 2 10 2 10s3 5.5 8 5.5c1.2 0 2.3-.3 3.2-.8M8.4 8.4a2.2 2.2 0 003.2 3.2",
  folder: "M3.5 6.5a1 1 0 011-1h3.3l1.5 1.7h5.7a1 1 0 011 1v6.3a1 1 0 01-1 1H4.5a1 1 0 01-1-1V6.5z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  ...rest
}: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
