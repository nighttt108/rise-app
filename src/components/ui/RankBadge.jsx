import { RANK_NAMES, RANK_COLORS } from '../../lib/xp'

const sizeMap = {
  sm: { badge: 'w-7 h-7 text-sm', label: 'text-xs' },
  md: { badge: 'w-10 h-10 text-lg', label: 'text-sm' },
  lg: { badge: 'w-16 h-16 text-3xl', label: 'text-base' },
}

export function RankBadge({ rank = 'E', size = 'md', showName = false }) {
  const color = RANK_COLORS[rank]
  const s = sizeMap[size]
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${s.badge} rounded flex items-center justify-center font-display font-bold border`}
        style={{
          color,
          borderColor: color,
          background: `${color}15`,
          boxShadow: rank === 'SS' ? `0 0 20px ${color}40` : `0 0 10px ${color}20`,
          fontFamily: 'var(--font-display)',
        }}
      >
        {rank}
      </div>
      {showName && (
        <span className={`${s.label} font-medium`} style={{ color, fontFamily: 'var(--font-display)' }}>
          {RANK_NAMES[rank]}
        </span>
      )}
    </div>
  )
}