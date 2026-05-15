import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { RANK_COLORS, RANK_NAMES } from '../lib/xp'
import { Flame, Zap, CheckCircle2, Trophy, LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const GENRE_ICONS = { fitness: '⚔️', running: '🏃', study: '📖' }
const RARITY_COLORS = { common: '#6b7280', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' }

export function ProfilePage() {
  const { user, profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [progress, setProgress] = useState([])
  const [inventory, setInventory] = useState([])
  const [equipped, setEquipped] = useState(null)
  const [stats, setStats] = useState({ totalQuests: 0, totalXP: 0, longestStreak: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const [{ data: prog }, { data: inv }, { data: eq }, { data: qs }] = await Promise.all([
      supabase.from('user_genre_progress').select('*, genres(name,slug), sub_paths(name,slug)').eq('user_id', user.id),
      supabase.from('user_inventory').select('*, items(*)').eq('user_id', user.id),
      supabase.from('user_equipped').select('*, title:title_item_id(*), border:border_item_id(*)').eq('user_id', user.id).single(),
      supabase.from('user_quests').select('id').eq('user_id', user.id).eq('status', 'completed'),
    ])
    if (prog) {
      setProgress(prog)
      const totalXP = prog.reduce((s, p) => s + p.total_xp, 0)
      const longestStreak = Math.max(...prog.map(p => p.longest_streak || 0), 0)
      setStats({ totalQuests: qs?.length || 0, totalXP, longestStreak })
    }
    if (inv) setInventory(inv)
    if (eq) setEquipped(eq)
    setLoading(false)
  }

  async function equipItem(itemId, itemType) {
    const col = itemType === 'title' ? 'title_item_id' : itemType === 'border' ? 'border_item_id' : 'badge_item_id'
    await supabase.from('user_equipped').upsert({ user_id: user.id, [col]: itemId })
    fetchAll()
  }

  if (loading) return (
    <div style={{ padding: '20px' }}>
      {[1,2,3].map(i => <div key={i} style={{ height: '100px', background: 'var(--bg-surface)', borderRadius: '14px', marginBottom: '12px' }} className="shimmer" />)}
    </div>
  )

  const username = profile?.username || user?.email?.split('@')[0] || 'Hunter'
  const highestRank = progress.reduce((best, p) => {
    const order = ['E','D','C','B','A','S','SS']
    return order.indexOf(p.current_rank) > order.indexOf(best) ? p.current_rank : best
  }, 'E')

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '32px' }}>

      {/* Hunter card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${RANK_COLORS[highestRank]}30`,
        borderRadius: '20px', padding: '24px', marginBottom: '16px',
        boxShadow: `0 0 40px ${RANK_COLORS[highestRank]}10`,
        backgroundImage: `radial-gradient(ellipse at top right, ${RANK_COLORS[highestRank]}08, transparent 60%)`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          {/* Avatar */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: `${RANK_COLORS[highestRank]}20`,
            border: `2px solid ${RANK_COLORS[highestRank]}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', flexShrink: 0,
            boxShadow: `0 0 20px ${RANK_COLORS[highestRank]}25`
          }}>
            {GENRE_ICONS[progress[0]?.genres?.slug] || '⚡'}
          </div>
          <div style={{ flex: 1 }}>
            {equipped?.title && (
              <div style={{ fontSize: '11px', color: RARITY_COLORS[equipped.title.rarity], fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                「{equipped.title.name}」
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
              {username}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {user?.email}
            </div>
          </div>
          {/* Highest rank */}
          <div style={{
            width: '48px', height: '48px', borderRadius: '10px',
            border: `2px solid ${RANK_COLORS[highestRank]}`,
            background: `${RANK_COLORS[highestRank]}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700,
            color: RANK_COLORS[highestRank],
            boxShadow: `0 0 16px ${RANK_COLORS[highestRank]}30`
          }}>{highestRank}</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
          {[
            { icon: <Zap size={16} />, value: stats.totalXP.toLocaleString(), label: 'Total XP', color: '#8b5cf6' },
            { icon: <CheckCircle2 size={16} />, value: stats.totalQuests, label: 'Quests Done', color: '#22c55e' },
            { icon: <Flame size={16} />, value: stats.longestStreak, label: 'Best Streak', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-deep)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active paths */}
      <SectionLabel>ACTIVE PATHS</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {progress.map(p => {
          const color = RANK_COLORS[p.current_rank]
          return (
            <div key={p.id} style={{
              background: 'var(--bg-surface)', border: `1px solid ${color}25`,
              borderRadius: '14px', padding: '16px',
              display: 'flex', alignItems: 'center', gap: '14px'
            }}>
              <span style={{ fontSize: '24px' }}>{GENRE_ICONS[p.genres?.slug]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {p.genres?.name} · {p.sub_paths?.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {p.total_xp.toLocaleString()} XP · {p.streak_days}d streak
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  border: `2px solid ${color}`, background: `${color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color
                }}>{p.current_rank}</div>
                <div style={{ fontSize: '10px', color, fontFamily: 'var(--font-display)', marginTop: '3px' }}>{RANK_NAMES[p.current_rank]}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Inventory */}
      {inventory.length > 0 && (
        <>
          <SectionLabel>INVENTORY</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '20px' }}>
            {inventory.map(inv => {
              const item = inv.items
              const rarityColor = RARITY_COLORS[item?.rarity] || '#6b7280'
              const isEquipped = equipped?.title_item_id === item?.id || equipped?.border_item_id === item?.id
              return (
                <button key={inv.id} onClick={() => equipItem(item.id, item.item_type)}
                  style={{
                    background: isEquipped ? `${rarityColor}12` : 'var(--bg-surface)',
                    border: `1px solid ${isEquipped ? rarityColor : 'var(--border-dim)'}`,
                    borderRadius: '12px', padding: '14px', textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: rarityColor, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {item?.rarity} {item?.item_type}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{item?.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item?.description}</div>
                  {isEquipped && (
                    <div style={{ marginTop: '8px', fontSize: '10px', color: rarityColor, fontFamily: 'var(--font-display)', fontWeight: 700 }}>✓ EQUIPPED</div>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {inventory.length === 0 && (
        <>
          <SectionLabel>INVENTORY</SectionLabel>
          <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '14px', marginBottom: '20px' }}>
            <Trophy size={32} color="var(--text-dim)" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Complete quests and rank up to earn items</div>
          </div>
        </>
      )}

      {/* Manage paths */}
      <button onClick={() => navigate('/manage-paths')} style={{
        width: '100%', padding: '13px', background: 'var(--bg-surface)',
        border: '1px solid var(--border-dim)', borderRadius: '12px', cursor: 'pointer',
        color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600,
        fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        marginBottom: '10px'
      }}>
        <Settings size={16} /> MANAGE PATHS
      </button>

      {/* Change username */}
      <button onClick={() => navigate('/setup-username')} style={{
        width: '100%', padding: '13px', background: 'var(--bg-surface)',
        border: '1px solid var(--border-dim)', borderRadius: '12px', cursor: 'pointer',
        color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600,
        fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        marginBottom: '10px'
      }}>
        ✏️ CHANGE USERNAME
      </button>

      {/* Sign out */}
      <button onClick={signOut} style={{
        width: '100%', padding: '13px', background: 'transparent',
        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', cursor: 'pointer',
        color: '#f87171', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)',
        letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'all 0.2s'
      }}>
        <LogOut size={16} /> SIGN OUT
      </button>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.2em', marginBottom: '10px' }}>
      {children}
    </div>
  )
}