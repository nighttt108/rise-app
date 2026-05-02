import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { getXPProgressInRank, getNextRank, RANK_COLORS, RANK_NAMES } from '../lib/xp'
import { CheckCircle2, Circle, Clock, Zap, Flame, ChevronRight, Lock } from 'lucide-react'

const GENRE_ICONS = { fitness: '⚔️', running: '🏃', study: '📖' }
const QUEST_TYPE_COLORS = { normal: '#22c55e', hard: '#3b82f6', raid: '#f59e0b', gate: '#ef4444' }
const QUEST_TYPE_LABELS = { normal: 'DAILY', hard: 'WEEKLY', raid: 'RAID', gate: 'GATE' }

export function DashboardPage() {
  const { user } = useAuthStore()
  const [progress, setProgress] = useState([])
  const [quests, setQuests] = useState([])
  const [activeGenre, setActiveGenre] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(null)
  const [justCompleted, setJustCompleted] = useState(null)

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const { data: prog } = await supabase
      .from('user_genre_progress')
      .select('*, genres(name, slug), sub_paths(name, slug)')
      .eq('user_id', user.id)

    const { data: qs } = await supabase
      .from('user_quests')
      .select('*, quest_templates(title, description, quest_type, frequency, base_xp, proof_type, sub_path_id)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (prog) { setProgress(prog); setActiveGenre(prog[0]?.genre_id || null) }
    if (qs) setQuests(qs)
    setLoading(false)
  }

  async function completeQuest(questId) {
    setCompleting(questId)
    const { data, error } = await supabase
      .from('user_quests')
      .update({ status: 'completed' })
      .eq('id', questId)
      .select('xp_awarded')
      .single()

    if (!error) {
      setJustCompleted({ questId, xp: data?.xp_awarded || 100 })
      setTimeout(() => setJustCompleted(null), 2500)
      await fetchAll()
    }
    setCompleting(null)
  }

  const activeProgress = progress.find(p => p.genre_id === activeGenre)
  const activeQuests = quests.filter(q => {
    const sp = activeProgress?.sub_path_id
    return q.quest_templates?.sub_path_id === sp
  })

  if (loading) return <LoadingDash />

  if (progress.length === 0) return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>NO ACTIVE PATHS</div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Complete onboarding to begin your journey.</p>
    </div>
  )

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>

      {/* XP Reward popup */}
      {justCompleted && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent-purple)', color: '#fff', padding: '10px 24px',
          borderRadius: '40px', fontFamily: 'var(--font-display)', fontSize: '16px',
          fontWeight: 700, letterSpacing: '0.1em', zIndex: 100,
          boxShadow: '0 0 30px rgba(139,92,246,0.6)',
          animation: 'fadeUp 0.3s ease',
        }}>
          +{justCompleted.xp} XP ⚡
        </div>
      )}

      {/* Genre tabs */}
      {progress.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          {progress.map(p => (
            <button key={p.genre_id} onClick={() => setActiveGenre(p.genre_id)} style={{
              padding: '7px 16px', borderRadius: '20px', border: `1px solid ${activeGenre === p.genre_id ? RANK_COLORS[p.current_rank] : 'var(--border-dim)'}`,
              background: activeGenre === p.genre_id ? `${RANK_COLORS[p.current_rank]}18` : 'var(--bg-surface)',
              color: activeGenre === p.genre_id ? RANK_COLORS[p.current_rank] : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
              whiteSpace: 'nowrap', transition: 'all 0.2s',
              flexShrink: 0
            }}>
              {GENRE_ICONS[p.genres?.slug]} {p.genres?.name}
            </button>
          ))}
        </div>
      )}

      {activeProgress && (
        <>
          {/* Rank + XP Card */}
          <RankCard progress={activeProgress} />

          {/* Streak banner */}
          {activeProgress.streak_days > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', marginBottom: '20px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '12px'
            }}>
              <Flame size={18} color="#f59e0b" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b', fontFamily: 'var(--font-display)' }}>
                {activeProgress.streak_days} DAY STREAK
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                {activeProgress.streak_days >= 30 ? '×2.0 XP' :
                 activeProgress.streak_days >= 14 ? '×1.75 XP' :
                 activeProgress.streak_days >= 7  ? '×1.5 XP' :
                 activeProgress.streak_days >= 3  ? '×1.2 XP' : 'Keep going!'}
              </span>
            </div>
          )}

          {/* Quest list */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>
              ACTIVE QUESTS
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {activeQuests.length} quest{activeQuests.length !== 1 ? 's' : ''}
            </div>
          </div>

          {activeQuests.length === 0 ? (
            <AllDoneCard />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeQuests.map(q => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  progress={activeProgress}
                  completing={completing === q.id}
                  onComplete={() => completeQuest(q.id)}
                />
              ))}
            </div>
          )}

          {/* Gate quest hint */}
          <GateQuestHint progress={activeProgress} />
        </>
      )}
    </div>
  )
}

function RankCard({ progress }) {
  const rank = progress.current_rank
  const color = RANK_COLORS[rank]
  const { current, needed, pct } = getXPProgressInRank(progress.total_xp, rank)
  const nextRank = getNextRank(rank)

  return (
    <div style={{
      background: 'var(--bg-surface)', border: `1px solid ${color}30`,
      borderRadius: '16px', padding: '20px', marginBottom: '16px',
      boxShadow: `0 0 30px ${color}10`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        {/* Rank badge */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '12px',
          border: `2px solid ${color}`, background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700,
          color, boxShadow: `0 0 20px ${color}30`, flexShrink: 0
        }}>{rank}</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
            {progress.genres?.name?.toUpperCase()} · {progress.sub_paths?.name?.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color, letterSpacing: '0.05em' }}>
            {RANK_NAMES[rank]}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
            {progress.total_xp.toLocaleString()} total XP
          </div>
        </div>

        {nextRank && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>NEXT</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: RANK_COLORS[nextRank] }}>{nextRank}</div>
          </div>
        )}
      </div>

      {/* XP Bar */}
      <div>
        <div style={{ height: '6px', background: 'var(--bg-deep)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
          <div style={{
            height: '100%', borderRadius: '3px', transition: 'width 0.8s ease',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 8px ${color}60`
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
          <span>{current.toLocaleString()} XP in rank</span>
          <span>{pct}% → {nextRank || 'MAX'}</span>
        </div>
      </div>
    </div>
  )
}

function QuestCard({ quest, progress, completing, onComplete }) {
  const t = quest.quest_templates
  const typeColor = QUEST_TYPE_COLORS[t?.quest_type] || '#6b7280'
  const rankColor = RANK_COLORS[progress.current_rank]
  const isGate = t?.quest_type === 'gate'

  // Estimate XP with multipliers
  const streakDays = progress.streak_days || 0
  const streakMult = streakDays >= 30 ? 2.0 : streakDays >= 14 ? 1.75 : streakDays >= 7 ? 1.5 : streakDays >= 3 ? 1.2 : 1.0
  const rankMult = { E:1.0, D:1.1, C:1.25, B:1.5, A:1.75, S:2.0, SS:2.5 }[progress.current_rank] || 1.0
  const diffMult = { normal:1.0, hard:2.0, raid:4.0, gate:8.0 }[t?.quest_type] || 1.0
  const estimatedXP = Math.round((t?.base_xp || 100) * diffMult * streakMult * rankMult)

  return (
    <div style={{
      background: isGate ? 'rgba(239,68,68,0.05)' : 'var(--bg-surface)',
      border: `1px solid ${isGate ? 'rgba(239,68,68,0.3)' : 'var(--border-dim)'}`,
      borderRadius: '14px', padding: '16px',
      transition: 'all 0.2s',
      boxShadow: isGate ? '0 0 20px rgba(239,68,68,0.08)' : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Complete button */}
        <button onClick={onComplete} disabled={completing} style={{
          background: 'none', border: 'none', cursor: completing ? 'wait' : 'pointer',
          color: typeColor, padding: '2px', flexShrink: 0, marginTop: '1px',
          opacity: completing ? 0.5 : 1, transition: 'all 0.2s'
        }}>
          {completing
            ? <div style={{ width: '22px', height: '22px', border: `2px solid ${typeColor}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            : <Circle size={22} />
          }
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Type badge + XP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-display)',
              color: typeColor, letterSpacing: '0.1em',
              padding: '2px 8px', borderRadius: '10px',
              background: `${typeColor}15`, border: `1px solid ${typeColor}30`
            }}>{QUEST_TYPE_LABELS[t?.quest_type]}</span>
            {isGate && <span style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'var(--font-display)' }}>RANK UP QUEST</span>}
          </div>

          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.4 }}>
            {t?.title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
            {t?.description}
          </div>

          {/* Proof type + XP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ProofBadge type={t?.proof_type} />
            <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: typeColor, fontFamily: 'var(--font-display)' }}>
              +{estimatedXP} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProofBadge({ type }) {
  const labels = { self_log: '📝 Self-log', photo: '📷 Photo', video: '🎥 Video', timer: '⏱ Timer', verified: '✅ Verified' }
  return (
    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
      {labels[type] || type}
    </span>
  )
}

function GateQuestHint({ progress }) {
  const rank = progress.current_rank
  const color = RANK_COLORS[rank]
  const { pct } = getXPProgressInRank(progress.total_xp, rank)
  if (pct < 80) return null

  return (
    <div style={{
      marginTop: '20px', padding: '14px 16px',
      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px'
    }}>
      <Lock size={18} color="#ef4444" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', fontFamily: 'var(--font-display)', marginBottom: '2px' }}>
          GATE QUEST UNLOCKED
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          You are {pct}% through Rank {rank}. Complete the Gate Quest to rank up.
        </div>
      </div>
      <ChevronRight size={16} color="#ef4444" />
    </div>
  )
}

function AllDoneCard() {
  return (
    <div style={{
      padding: '32px 20px', textAlign: 'center',
      background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
      borderRadius: '16px'
    }}>
      <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: '12px' }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        ALL QUESTS COMPLETE
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Come back tomorrow for new daily quests. Your streak is safe.
      </p>
    </div>
  )
}

function LoadingDash() {
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: i === 1 ? '120px' : '90px', background: 'var(--bg-surface)', borderRadius: '14px', marginBottom: '12px' }} className="shimmer" />
      ))}
    </div>
  )
}