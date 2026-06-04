// Custom SVG hexagon radar — six attributes, glowing "System" aesthetic.
export default function HexChart({ stats, attrs, accent = '#38bdf8', size = 240 }) {
  const cx = size / 2, cy = size / 2
  const R = size / 2 - 34
  const n = attrs.length
  const angle = (i) => (-Math.PI / 2) + (i * 2 * Math.PI / n)  // start at top
  const pt = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]

  // grid rings
  const rings = [0.25, 0.5, 0.75, 1].map(f =>
    attrs.map((_, i) => pt(i, R * f).join(',')).join(' ')
  )
  // data polygon
  const dataPts = attrs.map((a, i) => pt(i, R * (stats[a.key] / 100)).join(',')).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      <defs>
        <radialGradient id="hexfill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.12" />
        </radialGradient>
        <filter id="hexglow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* grid */}
      {rings.map((r, i) => (
        <polygon key={i} points={r} fill="none" stroke={accent} strokeOpacity={0.12} strokeWidth={1} />
      ))}
      {/* spokes */}
      {attrs.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={accent} strokeOpacity={0.12} strokeWidth={1} />
      })}

      {/* data */}
      <polygon points={dataPts} fill="url(#hexfill)" stroke={accent} strokeWidth={2} filter="url(#hexglow)" strokeLinejoin="round" />
      {attrs.map((a, i) => {
        const [x, y] = pt(i, R * (stats[a.key] / 100))
        return <circle key={i} cx={x} cy={y} r={3} fill={a.color} stroke="#0b1220" strokeWidth={1} />
      })}

      {/* labels */}
      {attrs.map((a, i) => {
        const [x, y] = pt(i, R + 20)
        return (
          <g key={i}>
            <text x={x} y={y - 3} textAnchor="middle" fontSize={11} fontWeight={800} fill={a.color}>{a.key}</text>
            <text x={x} y={y + 9} textAnchor="middle" fontSize={9} fill="#94a3b8">{stats[a.key]}</text>
          </g>
        )
      })}
    </svg>
  )
}
