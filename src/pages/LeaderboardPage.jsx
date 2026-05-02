import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { RANK_COLORS, RANK_NAMES } from '../lib/xp'
import { Crown, Flame, Zap } from 'lucide-react'

const GENRE_TABS = [
  { slug: 'fitness', name: 'Fitness', icon: '⚔️' },
  { slug: 'running', name: 'Running', icon: '🏃' },
  { slug: 'study', name: 'Study', icon: '📖' },
]

export function LeaderboardPage() {
  const { user } = useAuthStore()
  const [activeGenre, setActiveGenre] = useState('fitness')
  const [leaders, setLeaders] = useState([])
  const [myPosition, setMyPosition] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLeaderboard() }, [activeGenre])

  async function fetchLeaderboard() {
    setLoading(true)
    const { data: genre } = await supabase.from('genres').select('id').eq('slug', activeGenre).single()
    if (!genre) { setLoading(false); return }

    const { data } = await supabase
      .from('user_genre_progress')
      .select('*, users(username, email), sub_paths(name)')
      .eq('genre_id', genre.id)
      .order('total_xp', { ascending: false })
      .limit(50)

    if (data) {
      setLeaders(data)
      const myIdx = data.findIndex(d => d.user_id === user?.id)
      setMyPosition(myIdx >= 0 ? myIdx + 1 : null)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '32px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.1em', marginBottom: '4px' }}>
          LEADERBOARD
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Global rankings · resets monthly</div>
      </div>

      {/* Genre tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {GENRE_TABS.map(g => (
          <button key={g.slug} onClick={() => setActiveGenre(g.slug)} style={{
            flex: 1, padding: '8px', borderRadius: '10px',
            border: `1px solid ${activeGenre === g.slug ? 'var(--accent-purple)' : 'var(--border-dim)'}`,
            background: activeGenre === g.slug ? 'var(--accent-purple-dim)' : 'var(--bg-surface)',
            color: activeGenre === g.slug ? 'var(--accent-purple)' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            fontFamily: 'var(--font-display)', transition: 'all 0.2s'
          }}>
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      {/* My position banner */}
      {myPosition && (
        <div style={{
          padding: '12px 16px', marginBottom: '16px',
          background: 'var(--accent-purple-dim)', border: '1px solid var(--border-glow)',
          borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <Zap size={16} color="var(--accent-purple)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-purple)', fontFamily: 'var(--font-display)' }}>
            YOUR RANK: #{myPosition}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
            in {GENRE_TABS.find(g => g.slug === activeGenre)?.name}
          </span>
        </div>
      )}

      {/* Top 3 podium */}
      {!loading && leaders.length >= 3 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '20px', height: '120px' }}>
          {[leaders[1], leaders[0], leaders[2]].map((l, i) => {
            const pos = i === 0 ? 2 : i === 1 ? 1 : 3
            const heights = { 1: '120px', 2: '90px', 3: '75px' }
            const podiumColors = { 1: '#f59e0b', 2: '#6b7280', 3: '#cd7c3a' }
            const color = podiumColors[pos]
            const isMe = l?.user_id === user?.id
            const uname = l?.users?.username || l?.users?.email?.split('@')[0] || 'Hunter'
            return (
              <div key={pos} style={{ flex: 1, height: heights[pos], background: `${color}15`, border: `1px solid ${color}40`, borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', position: 'relative' }}>
                {pos === 1 && <Crown size={16} color={color} style={{ position: 'absolute', top: '8px' }} />}
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color }}>{pos}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                  {isMe ? 'YOU' : uname}
                </div>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1.5px solid ${RANK_COLORS[l?.current_rank]}`, background: `${RANK_COLORS[l?.current_rank]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: RANK_COLORS[l?.current_rank] }}>
                  {l?.current_rank}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: '64px', background: 'var(--bg-surface)', borderRadius: '12px' }} className="shimmer" />)}
        </div>
      ) : leaders.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '16px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>NO HUNTERS YET</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Be the first to join this path and claim the top spot.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leaders.map((l, i) => {
            const pos = i + 1
            const isMe = l.user_id === user?.id
            const color = RANK_COLORS[l.current_rank]
            const uname = l.users?.username || l.users?.email?.split('@')[0] || 'Hunter'
            const posColors = { 1: '#f59e0b', 2: '#9ca3af', 3: '#cd7c3a' }

            return (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                background: isMe ? 'var(--accent-purple-dim)' : 'var(--bg-surface)',
                border: `1px solid ${isMe ? 'var(--border-glow)' : 'var(--border-dim)'}`,
                borderRadius: '12px', transition: 'all 0.2s'
              }}>
                {/* Position */}
                <div style={{ width: '28px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: posColors[pos] || 'var(--text-dim)', flexShrink: 0 }}>
                  {pos <= 3 ? ['🥇','🥈','🥉'][pos-1] : `#${pos}`}
                </div>

                {/* Rank badge */}
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', border: `1.5px solid ${color}`, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color, flexShrink: 0 }}>
                  {l.current_rank}
                </div>

                {/* Name + path */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: isMe ? 'var(--accent-purple)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isMe ? 'YOU' : uname}
                    {isMe && <span style={{ fontSize: '10px', padding: '1px 6px', background: 'var(--accent-purple)', borderRadius: '10px', color: '#fff' }}>YOU</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{l.sub_paths?.name} · {l.streak_days}d streak</div>
                </div>

                {/* XP */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: isMe ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
                    {l.total_xp.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>XP</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}