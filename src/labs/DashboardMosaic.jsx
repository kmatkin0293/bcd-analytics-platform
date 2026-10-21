const TONES = ['var(--cobalt-soft)', 'var(--mid)', 'var(--card)', 'var(--high)', 'var(--primary)', 'var(--navy)']
const ROWS = [[3, 3], [2, 2, 2], [4, 2], [2, 4], [6]]
function random(seed) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
function DashboardMosaic({ seed, tiles }) {
  const next = random(seed)
  const blocks = []
  const wanted = Math.min(Math.max(tiles, 1), 9)
  while (blocks.length < wanted) {
    for (const span of ROWS[Math.floor(next() * ROWS.length)]) {
      if (blocks.length >= wanted) break
      const tone = TONES[Math.floor(next() * TONES.length)]
      blocks.push({ span, tone, kind: span <= 2 && next() > 0.4 ? 'kpi' : next() > 0.5 ? 'line' : 'bars' })
    }
  }
  const used = blocks.reduce((sum, b) => sum + b.span, 0) % 6
  if (used) blocks[blocks.length - 1].span += 6 - used
  return (
    <div className={tiles ? 'mosaic' : 'mosaic is-empty'} aria-hidden>
      {blocks.map((b, i) => (
        <span key={i} className={`mosaic-block is-${b.kind}`} style={{ gridColumn: `span ${b.span}`, '--tone': tiles ? b.tone : 'transparent' }} />
      ))}
    </div>
  )
}
export { DashboardMosaic }
