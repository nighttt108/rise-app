import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { getXPProgressInRank, getNextRank, RANK_COLORS, RANK_NAMES } from '../lib/xp'
import { CheckCircle2, Circle, Flame, Lock, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { RankUpAnimation } from '../components/ui/RankUpAnimation'
import { RankUpAnimation } from '../components/ui/RankUpAnimation'

const GENRE_ICONS = { fitness: '⚔️', running: '🏃', study: '📖' }

export function DashboardPage() {
  const { user } = useAuthStore()
  const [progress, setProgress] = useState([])
  const [quests, setQuests] = useState([])
  const [expandedGenre, setExpandedGenre] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(null)
  const [justCompleted, setJustCompleted] = useState(null)
  const [rankUp, setRankUp] = useState(null) // { fromRank, toRank, genreName }
  const [rankUp, setRankUp] = useState(null) // { fromRank, toRank }

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const { data: prog } = await supabase
      .from('user_genre_progress')
      .select('*, genres(name, slug), sub_paths(name, slug)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const { data: qs } = await supabase
      .from('user_quests')
      .select('*, quest_templates(title, description, quest_type, frequency, base_xp, proof_type, sub_path_id)')
      .eq('user_id', user.id)
      .in('status', ['active', 'completed'])

    if (prog) {
      setProgress(prog)
      setExpandedGenre(prev => prev || prog[0]?.genre_id || null)
    }
    if (qs) setQuests(qs)
    setLoading(false)
  }

  async function completeQuest(questId, baseXP, isGate, currentProgress) {
    setCompleting(questId)
    const prevRank = currentProgress?.current_rank

    const { data, error } = await supabase
      .from('user_quests')
      .update({ status: 'completed' })
      .eq('id', questId)
      .select('xp_awarded')
      .single()

    if (!error) {
      if (baseXP > 0) {
        setJustCompleted({ questId, xp: data?.xp_awarded || baseXP })
        setTimeout(() => setJustCompleted(null), 2500)
      }

      // If gate quest — check for rank up
      if (isGate) {
        const { data: newProg } = await supabase
          .from('user_genre_progress')
          .select('current_rank')
          .eq('user_id', user.id)
          .eq('genre_id', currentProgress.genre_id)
          .single()

        if (newProg && newProg.current_rank !== prevRank) {
          await fetchAll()
          setTimeout(() => setRankUp({
            fromRank: prevRank,
            toRank: newProg.current_rank,
            genreName: currentProgress.genres?.name
          }), 300)
          setCompleting(null)
          return
        }
      }
      await fetchAll()
    }
    setCompleting(null)
  }

  async function uncompleteQuest(questId) {
    await supabase.from('user_quests').update({ status: 'active', xp_awarded: null }).eq('id', questId)
    await fetchAll()
  }

  function getGenreQuests(subPathId) {
    return quests.filter(q => q.quest_templates?.sub_path_id === subPathId)
  }

  function getDailyProgress(subPathId) {
    const dailies = quests.filter(q => q.quest_templates?.sub_path_id === subPathId && q.quest_templates?.frequency === 'daily')
    return { completed: dailies.filter(q => q.status === 'completed').length, total: dailies.length }
  }

  if (loading) return (
    <div style={{ padding: '20px' }}>
      {[1, 2].map(i => <div key={i} style={{ height: '80px', background: 'var(--bg-surface)', borderRadius: '14px', marginBottom: '10px' }} className="shimmer" />)}
    </div>
  )

  if (progress.length === 0) return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>NO ACTIVE PATHS</div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Complete onboarding to begin your journey.</p>
    </div>
  )

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '32px' }}>

      {/* Rank up animation */}
      {rankUp && (
        <RankUpAnimation
          fromRank={rankUp.fromRank}
          toRank={rankUp.toRank}
          genreName={rankUp.genreName}
          onClose={() => setRankUp(null)}
        />
      )}

      {/* XP popup */}
      {justCompleted && (
        <div style={{
          position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent-purple)', color: '#fff',
          padding: '10px 24px', borderRadius: '40px',
          fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700,
          letterSpacing: '0.1em', zIndex: 100,
          boxShadow: '0 0 30px rgba(139,92,246,0.6)',
          animation: 'fadeUp 0.3s ease', whiteSpace: 'nowrap'
        }}>+{justCompleted.xp} XP ⚡</div>
      )}

      {/* Date + title */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.2em', marginBottom: '4px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>YOUR QUESTS</div>
      </div>

      {/* Genre cards */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {progress.map(p => {
          const color = RANK_COLORS[p.current_rank]
          const isExpanded = expandedGenre === p.genre_id
          const { completed, total } = getDailyProgress(p.sub_path_id)
          const allDone = total > 0 && completed === total
          return (
            <button key={p.genre_id} onClick={() => setExpandedGenre(isExpanded ? null : p.genre_id)} style={{
              flexShrink: 0, width: '140px', padding: '14px',
              background: isExpanded ? `${color}15` : 'var(--bg-surface)',
              border: `1px solid ${isExpanded ? color : 'var(--border-dim)'}`,
              borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s', boxShadow: isExpanded ? `0 0 20px ${color}20` : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '22px' }}>{GENRE_ICONS[p.genres?.slug]}</span>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1.5px solid ${color}`, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color }}>{p.current_rank}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: isExpanded ? color : 'var(--text-primary)', marginBottom: '6px' }}>{p.genres?.name}</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {Array.from({ length: total }).map((_, i) => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i < completed ? color : 'var(--border-dim)', transition: 'background 0.2s' }} />
                ))}
                {allDone && <Zap size={10} color={color} style={{ marginLeft: '2px' }} />}
              </div>
              {p.streak_days > 0 && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Flame size={10} />{p.streak_days}d
                </div>
              )}
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', color: 'var(--text-dim)' }}>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Expanded genre */}
      {progress.map(p => {
        if (expandedGenre !== p.genre_id) return null
        const color = RANK_COLORS[p.current_rank]
        const genreQuests = getGenreQuests(p.sub_path_id)
        const dailies = genreQuests.filter(q => q.quest_templates?.frequency === 'daily')
        const weeklies = genreQuests.filter(q => q.quest_templates?.frequency === 'hard' || q.quest_templates?.frequency === 'weekly')
        const gates = genreQuests.filter(q => q.quest_templates?.frequency === 'one_time')
        const completedDailies = dailies.filter(q => q.status === 'completed').length
        const allDailyDone = dailies.length > 0 && completedDailies === dailies.length
        const { current, needed, pct } = getXPProgressInRank(p.total_xp, p.current_rank)
        const nextRank = getNextRank(p.current_rank)

        return (
          <div key={p.genre_id} style={{ animation: 'fadeUp 0.25s ease' }}>
            {/* XP bar */}
            <div style={{ background: 'var(--bg-surface)', border: `1px solid ${color}25`, borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color, letterSpacing: '0.05em' }}>
                    {RANK_NAMES[p.current_rank]} · {p.sub_paths?.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{p.total_xp.toLocaleString()} total XP</div>
                </div>
                {nextRank && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>NEXT RANK</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: RANK_COLORS[nextRank] }}>{nextRank}</div>
                  </div>
                )}
              </div>
              <div style={{ height: '5px', background: 'var(--bg-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: '3px', background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}60`, transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
                <span>{current.toLocaleString()} XP in rank</span><span>{pct}%</span>
              </div>
            </div>

            {/* Streak/bonus banner */}
            {allDailyDone ? (
              <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '10px', background: `${color}12`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={16} color={color} />
                <span style={{ fontSize: '13px', fontWeight: 600, color, fontFamily: 'var(--font-display)' }}>ALL DAILIES DONE — +50% BONUS ON WEEKLY XP</span>
              </div>
            ) : dailies.length > 0 && (
              <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Flame size={16} color="#f59e0b" />
                <span style={{ fontSize: '13px', color: '#f59e0b', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {completedDailies}/{dailies.length} DAILIES · Complete all for +50% weekly bonus
                </span>
              </div>
            )}

            {/* Dailies */}
            {dailies.length > 0 && <>
              <SectionLabel color="var(--text-dim)">DAILY TRAINING — NO XP · BUILDS YOUR WEEKLY</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {dailies.map(q => <DailyCard key={q.id} quest={q} completing={completing === q.id} onComplete={() => completeQuest(q.id, 0, false, p)} onUncomplete={() => uncompleteQuest(q.id)} />)}
              </div>
            </>}

            {/* Weeklies */}
            {weeklies.length > 0 && <>
              <SectionLabel color={color}>WEEKLY QUESTS — EARN XP {allDailyDone ? '(+50% BONUS ACTIVE ⚡)' : ''}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {weeklies.map(q => {
                  const baseXP = q.quest_templates?.base_xp || 200
                  const finalXP = allDailyDone ? Math.round(baseXP * 1.5) : baseXP
                  return <WeeklyCard key={q.id} quest={q} xp={finalXP} bonusActive={allDailyDone} completing={completing === q.id} color={color} onComplete={() => completeQuest(q.id, finalXP, false, p)} onUncomplete={() => uncompleteQuest(q.id)} />
                })}
              </div>
            </>}

            {/* Gate quests */}
            {gates.length > 0 && <>
              <SectionLabel color="#ef4444">GATE QUEST — RANK UP</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {gates.map(q => <GateCard key={q.id} quest={q} completing={completing === q.id} onComplete={() => completeQuest(q.id, q.quest_templates?.base_xp || 800, true, p)} />)}
              </div>
            </>}
          </div>
        )
      })}
    </div>
  )
}

function DailyCard({ quest, completing, onComplete, onUncomplete }) {
  const done = quest.status === 'completed'
  return (
    <div style={{ background: done ? 'rgba(34,197,94,0.05)' : 'var(--bg-surface)', border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border-dim)'}`, borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'flex-start', gap: '12px', opacity: done ? 0.7 : 1, transition: 'all 0.2s' }}>
      <button onClick={done ? onUncomplete : onComplete} disabled={completing} style={{ background: 'none', border: 'none', cursor: 'pointer', color: done ? '#22c55e' : 'var(--text-dim)', padding: '2px', flexShrink: 0, marginTop: '1px' }}>
        {completing ? <div style={{ width: '20px', height: '20px', border: '2px solid var(--text-dim)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: done ? 400 : 500, color: done ? 'var(--text-dim)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', marginBottom: '3px' }}>{quest.quest_templates?.title}</div>
        {!done && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{quest.quest_templates?.description}</div>}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-dim)', flexShrink: 0, fontFamily: 'var(--font-display)' }}>{done ? '✓ DONE' : 'NO XP'}</div>
    </div>
  )
}

function WeeklyCard({ quest, xp, bonusActive, completing, onComplete, onUncomplete, color }) {
  const done = quest.status === 'completed'
  return (
    <div style={{ background: done ? `${color}08` : 'var(--bg-surface)', border: `1px solid ${done ? `${color}30` : 'var(--border-dim)'}`, borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'flex-start', gap: '12px', transition: 'all 0.2s' }}>
      <button onClick={done ? onUncomplete : onComplete} disabled={completing} style={{ background: 'none', border: 'none', cursor: 'pointer', color: done ? color : 'var(--text-dim)', padding: '2px', flexShrink: 0, marginTop: '1px' }}>
        {completing ? <div style={{ width: '20px', height: '20px', border: `2px solid ${color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-display)', color, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}30` }}>WEEKLY</span>
          {bonusActive && !done && <span style={{ fontSize: '10px', color: '#f59e0b', fontFamily: 'var(--font-display)' }}>⚡ BONUS</span>}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: done ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', marginBottom: '4px' }}>{quest.quest_templates?.title}</div>
        {!done && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{quest.quest_templates?.description}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: done ? 'var(--text-dim)' : color }}>{done ? `+${quest.xp_awarded || xp}` : `+${xp}`} XP</div>
        {bonusActive && !done && <div style={{ fontSize: '10px', color: '#f59e0b', textDecoration: 'line-through' }}>{Math.round(xp / 1.5)}</div>}
      </div>
    </div>
  )
}

function GateCard({ quest, completing, onComplete }) {
  const done = quest.status === 'completed'
  return (
    <div style={{ background: 'rgba(239,68,68,0.04)', border: `1px solid ${done ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '12px', padding: '16px', boxShadow: '0 0 20px rgba(239,68,68,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Lock size={14} color="#ef4444" />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>GATE QUEST — RANK UP</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>+{quest.quest_templates?.base_xp || 800} XP</span>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{quest.quest_templates?.title}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>{quest.quest_templates?.description}</div>
      {!done ? (
        <button onClick={onComplete} disabled={completing} style={{ width: '100%', padding: '11px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
          {completing ? 'SUBMITTING...' : 'MARK AS COMPLETE — SUBMIT PROOF'}
        </button>
      ) : (
        <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', textAlign: 'center', color: '#ef4444', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>✓ GATE CLEARED</div>
      )}
    </div>
  )
}

function SectionLabel({ children, color }) {
  return <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, color: color || 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: '8px' }}>{children}</div>
}