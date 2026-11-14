// 16x16 pixel map: a monitor whose screen holds a pair of glasses.
// '#' = frame, 'o' = lens glint.
export const LOGO_PIXELS = [
  '................',
  '.##############.',
  '.#............#.',
  '.#............#.',
  '.#............#.',
  '.#.####..####.#.',
  '.#.#oo####oo#.#.',
  '.#.#oo#..#oo#.#.',
  '.#.####..####.#.',
  '.#............#.',
  '.#............#.',
  '.##############.',
  '......####......',
  '......####......',
  '...##########...',
  '................'
]

export default function Logo({ size = 22 }: { size?: number }) {
  const rects: JSX.Element[] = []
  LOGO_PIXELS.forEach((row, y) => row.split('').forEach((c, x) => {
    if (c === '#') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />)
    else if (c === 'o') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" opacity={0.35} />)
  }))
  return <svg className="logo" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">{rects}</svg>
}
