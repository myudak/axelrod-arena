/**
 * Pixel-art icons drawn from 7×7 bitmaps ("#" = filled). The pixel font has no
 * arrows or symbols, so every glyph-style icon in the UI goes through here.
 */
const bitmaps = {
  arrowRight: [
    ".......",
    "....#..",
    ".....#.",
    "#######",
    ".....#.",
    "....#..",
    ".......",
  ],
  arrowLeft: [
    ".......",
    "..#....",
    ".#.....",
    "#######",
    ".#.....",
    "..#....",
    ".......",
  ],
  play: [
    ".#.....",
    ".##....",
    ".###...",
    ".####..",
    ".###...",
    ".##....",
    ".#.....",
  ],
  pause: [
    ".......",
    ".##.##.",
    ".##.##.",
    ".##.##.",
    ".##.##.",
    ".##.##.",
    ".......",
  ],
  prev: [
    ".......",
    "....#..",
    "...##..",
    "..###..",
    "...##..",
    "....#..",
    ".......",
  ],
  next: [
    ".......",
    "..#....",
    "..##...",
    "..###..",
    "..##...",
    "..#....",
    ".......",
  ],
  first: [
    ".......",
    ".#..#..",
    ".#.##..",
    ".####..",
    ".#.##..",
    ".#..#..",
    ".......",
  ],
  last: [
    ".......",
    "..#..#.",
    "..##.#.",
    "..####.",
    "..##.#.",
    "..#..#.",
    ".......",
  ],
  swap: [
    "....#..",
    "#######",
    "....#..",
    ".......",
    "..#....",
    "#######",
    "..#....",
  ],
  dice: [
    "#######",
    "#.....#",
    "#.#.#.#",
    "#.....#",
    "#.#.#.#",
    "#.....#",
    "#######",
  ],
  soundOn: [
    "...#...",
    "..##.#.",
    "####..#",
    "####..#",
    "####..#",
    "..##.#.",
    "...#...",
  ],
  soundOff: [
    "...#...",
    "..##...",
    "####.#.",
    "#####..",
    "####.#.",
    "..##...",
    "...#...",
  ],
  star: [
    "...#...",
    "...#...",
    "#######",
    ".#####.",
    "..###..",
    ".##.##.",
    ".#...#.",
  ],
  trophy: [
    "#######",
    "#.###.#",
    ".#####.",
    "..###..",
    "...#...",
    "..###..",
    ".#####.",
  ],
  lock: [
    "..###..",
    ".#...#.",
    ".#...#.",
    "#######",
    "###.###",
    "###.###",
    "#######",
  ],
  check: [
    ".......",
    "......#",
    ".....#.",
    "#...#..",
    ".#.#...",
    "..#....",
    ".......",
  ],
  close: [
    "#.....#",
    ".#...#.",
    "..#.#..",
    "...#...",
    "..#.#..",
    ".#...#.",
    "#.....#",
  ],
  bolt: [
    "....##.",
    "...##..",
    "..##...",
    ".######",
    "...##..",
    "..##...",
    ".##....",
  ],
  heart: [
    ".##.##.",
    "#######",
    "#######",
    "#######",
    ".#####.",
    "..###..",
    "...#...",
  ],
} as const;

export type PixelIconName = keyof typeof bitmaps;

const paths = Object.fromEntries(
  Object.entries(bitmaps).map(([name, rows]) => [
    name,
    rows
      .flatMap((row, y) =>
        [...row].map((cell, x) => (cell === "#" ? `M${x} ${y}h1v1h-1z` : "")),
      )
      .join(""),
  ]),
) as Record<PixelIconName, string>;

export function PixelIcon({
  name,
  size = 14,
  label,
  className = "",
}: {
  name: PixelIconName;
  size?: number;
  /** Accessible name; omit for decorative icons. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={`pixel-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      fill="currentColor"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
