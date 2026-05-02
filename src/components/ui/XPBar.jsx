import { getXPProgressInRank, getNextRank, RANK_COLORS } from '../../lib/xp'

export function XPBar({ rank, totalXP, animated = true }) {
  const { current, needed, pct } = getXPProgressInRank(totalXP, rank)
  const nextRank = getNextRank(rank)
  const color = RANK_COLORS[rank]

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs" style={{ color, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          {rank} RANK
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {current.toLocaleString()} / {needed === Infinity ? '∞' : needed.toLocaleString()} XP
          {nextRank && <span style={{ color }}> → {nextRank}</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-dim)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{pct}%</span>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {totalXP.toLocaleString()} total XP
        </span>
      </div>
    </div>
  )
}