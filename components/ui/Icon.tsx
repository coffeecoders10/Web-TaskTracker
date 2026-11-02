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
  gear: "M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM10 3v1.7M10 15.3V17M3 10h1.7M15.3 10H17M5 5l1.2 1.2M13.8 13.8L15 15M15 5l-1.2 1.2M6.2 13.8L5 15",
  undo: "M7.5 4.5L4 8l3.5 3.5M4.5 8H12a3.5 3.5 0 010 7H8",
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
