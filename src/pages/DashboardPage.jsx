import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { getXPProgressInRank, getNextRank, RANK_COLORS, RANK_NAMES } from '../lib/xp'
import { CheckCircle2, Circle, Flame, Lock, ChevronDown, ChevronUp, Zap, Dumbbell } from 'lucide-react'
import { RankUpAnimation } from '../components/ui/RankUpAnimation'
import { SessionPicker } from '../components/ui/SessionPicker'

const GENRE_ICONS = { fitness: '⚔️', running: '🏃', study: '📖' }

export function DashboardPage() {
  const { user } = useAuthStore()
  const [progress, setProgress] = useState([])
  const [quests, setQuests] = useState([])
  const [expandedGenre, setExpandedGenre] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(null)
  const [justCompleted, setJustCompleted] = useState(null)
  const [rankUp, setRankUp] = useState(null)
  const [sessionPicker, setSessionPicker] = useState(null) // progress row

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const { data: prog } = await supabase
      .from('user_genre_progress')
      .select('*, genres(name, slug), sub_paths(name, slug)')
      .eq('user_id', user.id)

    const { data: qs } = await supabase
      .from('user_quests')
      .select('*, quest_templates(title, description, quest_type, frequency, base_xp, proof_type, sub_path_id, session_slug)')
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
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', questId)
      .select('xp_awarded')
      .single()

    if (!error) {
      if (baseXP > 0) {
        setJustCompleted({ questId, xp: data?.xp_awarded || baseXP })
        setTimeout(() => setJustCompleted(null), 2500)
      }
      if (isGate && currentProgress) {
        const { data: newProg } = await supabase
          .from('user_genre_progress')
          .select('current_rank, genres(name)')
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
    await supabase.from('user_quests').update({ status: 'active', xp_awarded: null, completed_at: null }).eq('id', questId)
    await fetchAll()
  }

  function getGenreQuests(subPathId) {
    return quests.filter(q => q.quest_templates?.sub_path_id === subPathId)
  }

  function getDailyProgress(subPathId) {
    const dailies = quests.filter(q =>
      q.quest_templates?.sub_path_id === subPathId &&
      q.quest_templates?.frequency === 'daily'
    )
    const completed = dailies.filter(q => q.status === 'completed').length
    return { completed, total: dailies.length }
  }

  function handleGenreCardTap(p) {
    const isFitness = p.genres?.slug === 'fitness'
    if (isFitness) {
      // For fitness, show session picker if not expanded, expand if already has session picked
      if (expandedGenre === p.genre_id) {
        setSessionPicker(p)
      } else {
        setExpandedGenre(p.genre_id)
      }
    } else {
      setExpandedGenre(expandedGenre === p.genre_id ? null : p.genre_id)
    }
  }

  if (loading) return (
    <div style={{ padding: '20px' }}>
      {[1,2].map(i => <div key={i} style={{ height: '80px', background: 'var(--bg-surface)', borderRadius: '14px', marginBottom: '10px' }} className="shimmer" />)}
    </div>
  )

  if (progress.length === 0) return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>NO ACTIVE PATHS</div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Complete onboarding to begin your journey.</p>
    </div>
  )

  const today = new Date().toISOString().split('T')[0]

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

      {/* Session picker modal */}
      {sessionPicker && (
        <SessionPicker
          progress={sessionPicker}
          userId={user.id}
          onSessionPicked={() => { setSessionPicker(null); fetchAll() }}
          onClose={() => setSessionPicker(null)}
        />
      )}

      {/* XP popup */}
      {justCompleted && (
        <div style={{ position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-purple)', color: '#fff', padding: '10px 24px', borderRadius: '40px', fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.1em', zIndex: 100, boxShadow: '0 0 30px rgba(139,92,246,0.6)', animation: 'fadeUp 0.3s ease' }}>
          +{justCompleted.xp} XP ⚡
        </div>
      )}

      {/* Header */}
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
          const isFitness = p.genres?.slug === 'fitness'
          const { completed, total } = getDailyProgress(p.sub_path_id)
          const allDailyDone = total > 0 && completed === total
          const todaySessionSlug = p.last_session_date === today ? p.last_session_slug : null

          return (
            <button key={p.genre_id} onClick={() => handleGenreCardTap(p)} style={{
              flexShrink: 0, width: '150px', padding: '14px',
              background: isExpanded ? `${color}15` : 'var(--bg-surface)',
              border: `1px solid ${isExpanded ? color : 'var(--border-dim)'}`,
              borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s',
              boxShadow: isExpanded ? `0 0 20px ${color}20` : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '22px' }}>{GENRE_ICONS[p.genres?.slug]}</span>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1.5px solid ${color}`, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color }}>
                  {p.current_rank}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: isExpanded ? color : 'var(--text-primary)', marginBottom: '4px' }}>
                {p.genres?.name}
              </div>

              {/* Sub-path name */}
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                {p.sub_paths?.name}
              </div>

              {/* For fitness: show today's session or prompt */}
              {isFitness && (
                <div style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-display)', color: todaySessionSlug ? color : '#f59e0b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Dumbbell size={10} />
                  {todaySessionSlug ? todaySessionSlug.replace('-', ' ').toUpperCase() : 'PICK SESSION'}
                </div>
              )}

              {/* Daily dots */}
              {total > 0 && (
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center', marginBottom: '4px' }}>
                  {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
                    <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: i < completed ? color : 'var(--border-dim)', transition: 'background 0.2s' }} />
                  ))}
                  {allDailyDone && <Zap size={9} color={color} style={{ marginLeft: '2px' }} />}
                </div>
              )}

              {p.streak_days > 0 && (
                <div style={{ fontSize: '10px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Flame size={9} />{p.streak_days}d
                </div>
              )}
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center', color: 'var(--text-dim)' }}>
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Expanded genre content */}
      {progress.map(p => {
        if (expandedGenre !== p.genre_id) return null
        const color = RANK_COLORS[p.current_rank]
        const isFitness = p.genres?.slug === 'fitness'
        const genreQuests = getGenreQuests(p.sub_path_id)
        const dailies = genreQuests.filter(q => q.quest_templates?.frequency === 'daily')
        const weeklies = genreQuests.filter(q => q.quest_templates?.frequency === 'hard')
        const gates = genreQuests.filter(q => q.quest_templates?.frequency === 'one_time')
        const completedDailies = dailies.filter(q => q.status === 'completed').length
        const allDailyDone = dailies.length > 0 && completedDailies === dailies.length
        const { current, needed, pct } = getXPProgressInRank(p.total_xp, p.current_rank)
        const nextRank = getNextRank(p.current_rank)
        const todaySessionSlug = p.last_session_date === today ? p.last_session_slug : null

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
                {nextRank && <div style={{ textAlign: 'right' }}><div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>NEXT</div><div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: RANK_COLORS[nextRank] }}>{nextRank}</div></div>}
              </div>
              <div style={{ height: '5px', background: 'var(--bg-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: '3px', background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}60`, transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
                <span>{current.toLocaleString()} XP in rank</span><span>{pct}%</span>
              </div>
            </div>

            {/* Fitness session picker prompt */}
            {isFitness && !todaySessionSlug && (
              <button onClick={() => setSessionPicker(p)} style={{
                width: '100%', padding: '14px 16px', marginBottom: '16px',
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s'
              }}>
                <Dumbbell size={20} color="#f59e0b" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginBottom: '2px' }}>PICK TODAY'S SESSION</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tap to choose your training session — your quests will load instantly.</div>
                </div>
                <ChevronDown size={16} color="#f59e0b" />
              </button>
            )}

            {/* Session picked banner */}
            {isFitness && todaySessionSlug && (
              <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '10px', background: `${color}10`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Dumbbell size={15} color={color} />
                <span style={{ fontSize: '13px', fontWeight: 600, color, fontFamily: 'var(--font-display)' }}>
                  TODAY: {todaySessionSlug.replace(/-/g, ' ').toUpperCase()}
                </span>
                <button onClick={() => setSessionPicker(p)} style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Change</button>
              </div>
            )}

            {/* Streak bonus */}
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

            {/* Daily quests */}
            {dailies.length > 0 && (
              <>
                <SectionLabel color="var(--text-dim)">DAILY TRAINING — NO XP · BUILDS YOUR WEEKLY</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {dailies.map(q => (
                    <DailyQuestCard key={q.id} quest={q} completing={completing === q.id}
                      onComplete={() => completeQuest(q.id, 0, false, p)}
                      onUncomplete={() => uncompleteQuest(q.id)} />
                  ))}
                </div>
              </>
            )}

            {/* Weekly quests */}
            {weeklies.length > 0 && (
              <>
                <SectionLabel color={color}>WEEKLY QUESTS — EARN XP {allDailyDone ? '(+50% BONUS ⚡)' : ''}</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {weeklies.map(q => {
                    const baseXP = q.quest_templates?.base_xp || 200
                    const finalXP = allDailyDone ? Math.round(baseXP * 1.5) : baseXP
                    return (
                      <WeeklyQuestCard key={q.id} quest={q} xp={finalXP} bonusActive={allDailyDone}
                        completing={completing === q.id} color={color}
                        onComplete={() => completeQuest(q.id, finalXP, false, p)}
                        onUncomplete={() => uncompleteQuest(q.id)} />
                    )
                  })}
                </div>
              </>
            )}

            {/* Gate quests */}
            {gates.length > 0 && (
              <>
                <SectionLabel color="#ef4444">GATE QUEST — RANK UP</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {gates.map(q => (
                    <GateQuestCard key={q.id} quest={q} completing={completing === q.id}
                      onComplete={() => completeQuest(q.id, q.quest_templates?.base_xp || 800, true, p)} />
                  ))}
                </div>
              </>
            )}

            {/* Empty state for fitness with no session */}
            {isFitness && !todaySessionSlug && dailies.length === 0 && weeklies.length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '14px' }}>
                <Dumbbell size={36} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>PICK YOUR SESSION FIRST</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tap "Pick Today's Session" above to load your workout quests.</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── DAILY QUEST CARD ─────────────────────────────────────────
function DailyQuestCard({ quest, completing, onComplete, onUncomplete }) {
  const [expanded, setExpanded] = useState(false)
  const done = quest.status === 'completed'
  return (
    <div style={{ background: done ? 'rgba(34,197,94,0.05)' : 'var(--bg-surface)', border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border-dim)'}`, borderRadius: '12px', padding: '12px 14px', transition: 'all 0.2s', opacity: done ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <button onClick={done ? onUncomplete : onComplete} disabled={completing} style={{ background: 'none', border: 'none', cursor: 'pointer', color: done ? '#22c55e' : 'var(--text-dim)', padding: '2px', flexShrink: 0, marginTop: '1px' }}>
          {completing ? <div style={{ width: '20px', height: '20px', border: '2px solid var(--text-dim)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: done ? 400 : 500, color: done ? 'var(--text-dim)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', marginBottom: done ? 0 : '2px' }}>
            {quest.quest_templates?.title}
          </div>
          {!done && (
            <>
              {expanded && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '6px' }}>{quest.quest_templates?.description}</div>}
              <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-dim)', padding: '2px 0', marginTop: '2px' }}>
                {expanded ? '▲ less' : '▼ see exercises'}
              </button>
            </>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', flexShrink: 0, fontFamily: 'var(--font-display)' }}>
          {done ? '✓' : 'NO XP'}
        </div>
      </div>
    </div>
  )
}

// ── WEEKLY QUEST CARD ────────────────────────────────────────
function WeeklyQuestCard({ quest, xp, bonusActive, completing, onComplete, onUncomplete, color }) {
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
        <div style={{ fontSize: '14px', fontWeight: 500, color: done ? 'var(--text-secondary)' : 'var(--text-primary)', marginBottom: '4px', textDecoration: done ? 'line-through' : 'none' }}>{quest.quest_templates?.title}</div>
        {!done && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{quest.quest_templates?.description}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: done ? 'var(--text-dim)' : color }}>+{xp} XP</div>
        {bonusActive && !done && <div style={{ fontSize: '10px', color: '#f59e0b', textDecoration: 'line-through', marginTop: '1px' }}>{Math.round(xp / 1.5)}</div>}
      </div>
    </div>
  )
}

// ── GATE QUEST CARD ──────────────────────────────────────────
function GateQuestCard({ quest, completing, onComplete }) {
  const done = quest.status === 'completed'
  return (
    <div style={{ background: done ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.04)', border: `1px solid ${done ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '12px', padding: '16px', boxShadow: '0 0 20px rgba(239,68,68,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Lock size={14} color="#ef4444" />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>GATE QUEST — RANK UP</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>+{quest.quest_templates?.base_xp || 800} XP</span>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{quest.quest_templates?.title}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>{quest.quest_templates?.description}</div>
      {!done ? (
        <button onClick={onComplete} disabled={completing} style={{ width: '100%', padding: '11px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', transition: 'all 0.2s' }}>
          {completing ? 'SUBMITTING...' : 'MARK COMPLETE — SUBMIT PROOF'}
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