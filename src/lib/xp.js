export const RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS']

export const RANK_NAMES = {
  E: 'Beginner', D: 'Apprentice', C: 'Skilled',
  B: 'Expert', A: 'Elite', S: 'Shadow', SS: 'Monarch'
}

export const RANK_XP_THRESHOLDS = {
  E: 0, D: 5000, C: 20000, B: 60000,
  A: 150000, S: 400000, SS: 1000000
}

export const RANK_BONUS = {
  E: 1.0, D: 1.1, C: 1.25, B: 1.5,
  A: 1.75, S: 2.0, SS: 2.5
}

export const DIFFICULTY_BONUS = {
  normal: 1.0, hard: 2.0, raid: 4.0, gate: 8.0
}

export const RANK_COLORS = {
  E: 'var(--rank-e)', D: 'var(--rank-d)', C: 'var(--rank-c)',
  B: 'var(--rank-b)', A: 'var(--rank-a)', S: 'var(--rank-s)', SS: 'var(--rank-ss)'
}

export function getStreakMultiplier(streakDays) {
  if (streakDays >= 30) return 2.0
  if (streakDays >= 14) return 1.75
  if (streakDays >= 7)  return 1.5
  if (streakDays >= 3)  return 1.2
  return 1.0
}

export function calculateXP({ baseXP = 100, difficulty = 'normal', streakDays = 0, rank = 'E', penaltyPct = 0 }) {
  const diffMod = DIFFICULTY_BONUS[difficulty] ?? 1.0
  const streakMod = getStreakMultiplier(streakDays)
  const rankMod = RANK_BONUS[rank] ?? 1.0
  const raw = Math.round(baseXP * diffMod * streakMod * rankMod)
  if (penaltyPct > 0) return Math.round(raw * (1 - penaltyPct / 100))
  return raw
}

export function getRankForXP(totalXP) {
  const ranks = [...RANKS].reverse()
  for (const rank of ranks) {
    if (totalXP >= RANK_XP_THRESHOLDS[rank]) return rank
  }
  return 'E'
}

export function getXPProgressInRank(totalXP, rank) {
  const current = RANK_XP_THRESHOLDS[rank]
  const nextRankIndex = RANKS.indexOf(rank) + 1
  if (nextRankIndex >= RANKS.length) return { current: totalXP - current, needed: Infinity, pct: 100 }
  const next = RANK_XP_THRESHOLDS[RANKS[nextRankIndex]]
  const inRank = totalXP - current
  const needed = next - current
  return { current: inRank, needed, pct: Math.min(100, Math.round((inRank / needed) * 100)) }
}

export function getNextRank(rank) {
  const idx = RANKS.indexOf(rank)
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null
}