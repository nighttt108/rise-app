import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { ChevronLeft, Check } from 'lucide-react'

const GENRES = [
  {
    slug: 'fitness', name: 'Fitness', icon: '⚔️',
    description: 'Gym-based training — build muscle, power, endurance or shred fat',
    color: '#8b5cf6',
    subPaths: [
      { slug: 'ppl', name: 'Push / Pull / Legs', desc: 'Most popular split · 3–6 days/week · balanced development' },
      { slug: 'bro-split', name: 'Classic Bro Split', desc: '5 days · one muscle group per day · maximum volume' },
      { slug: 'synergistic', name: 'Synergistic Split', desc: '4 days · smart muscle pairing · best recovery efficiency' },
      { slug: 'endurance', name: 'Muscular Endurance', desc: '3 circuit days · high reps · builds stamina and work capacity' },
      { slug: 'power', name: 'Power & Explosiveness', desc: '3 days · low reps · maximum speed · athletic performance' },
      { slug: 'cardio', name: 'Cardio Focus', desc: '5 days · HIIT, LISS, tempo · fat loss and cardiovascular health' },
    ]
  },
  {
    slug: 'running', name: 'Running', icon: '🏃',
    description: 'From your first 5K to elite marathon times',
    color: '#14b8a6',
    subPaths: [
      { slug: '5k', name: '5K', desc: 'Build up and improve your time' },
      { slug: '10k', name: '10K', desc: 'Train for the 10K distance' },
      { slug: 'half-marathon', name: 'Half Marathon', desc: 'Conquer 21.1km' },
      { slug: 'marathon', name: 'Marathon', desc: 'The ultimate 42.2km test' },
    ]
  },
]

const PLACEMENT_QUESTIONS = {
  fitness: [
    { id: 'experience', question: 'How long have you been training at a gym consistently?', options: ['Less than 3 months', '3–12 months', '1–3 years', '3+ years'], rankMap: [null, 'D', 'C', 'B'] },
    { id: 'frequency', question: 'How many days per week do you currently train?', options: ['1–2 days', '3–4 days', '5–6 days', 'Every day'], rankMap: [null, null, 'D', 'C'] },
    { id: 'level', question: 'How would you honestly rate your current strength level?', options: ['Complete beginner', 'I know the basics', 'Intermediate — solid lifts', 'Advanced — competitive level'], rankMap: [null, 'D', 'C', 'B'] },
  ],
  running: [
    { id: 'experience', question: 'Have you completed a 5K before?', options: ['Never run 5K', 'Yes, but slowly', 'Yes, under 30 min', 'Yes, under 22 min'], rankMap: [null, 'D', 'C', 'B'] },
    { id: 'weekly_km', question: 'How many km per week do you currently run?', options: ['Less than 10km', '10–25km', '25–50km', '50km+'], rankMap: [null, 'D', 'C', 'B'] },
    { id: 'races', question: 'Have you completed any official races?', options: ['No races', '1–2 races', '3–5 races', '5+ races'], rankMap: [null, 'D', 'C', 'B'] },
  ],
}

const RANK_COLORS = { E: '#6b7280', D: '#22c55e', C: '#3b82f6', B: '#8b5cf6' }
const RANK_NAMES = { E: 'Beginner', D: 'Apprentice', C: 'Skilled', B: 'Expert' }

function determinePlacementRank(answers, questions) {
  const rankCounts = { E: 0, D: 0, C: 0, B: 0 }
  questions.forEach(q => {
    const idx = answers[q.id]
    if (idx !== undefined) { const r = q.rankMap[idx] || 'E'; rankCounts[r]++ }
  })
  if (rankCounts['B'] >= 2) return 'B'
  if (rankCounts['C'] >= 2) return 'C'
  if (rankCounts['D'] >= 2) return 'D'
  return 'E'
}

function StepHeader({ title, subtitle, step, color }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: '520px', marginBottom: '28px' }}>
      <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 600, color: color || 'var(--accent-purple)', letterSpacing: '0.2em', marginBottom: '10px', opacity: 0.8 }}>{step}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.06em', marginBottom: '8px' }}>{title}</div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  )
}

function NavButtons({ onBack, onNext, nextDisabled, nextLabel }) {
  return (
    <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '520px' }}>
      <button onClick={onBack} style={{ padding: '12px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
        <ChevronLeft size={16} /> Back
      </button>
      <button onClick={onNext} disabled={nextDisabled} style={{ flex: 1, padding: '12px', background: nextDisabled ? 'var(--bg-elevated)' : 'var(--accent-purple)', border: 'none', borderRadius: '10px', cursor: nextDisabled ? 'not-allowed' : 'pointer', color: nextDisabled ? 'var(--text-dim)' : '#fff', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', boxShadow: nextDisabled ? 'none' : '0 0 20px rgba(139,92,246,0.3)', transition: 'all 0.2s' }}>{nextLabel}</button>
    </div>
  )
}

export function OnboardingPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [selectedGenres, setSelectedGenres] = useState([])
  const [currentGenreIdx, setCurrentGenreIdx] = useState(0)
  const [subPathSelections, setSubPathSelections] = useState({})
  const [placementAnswers, setPlacementAnswers] = useState({})
  const [loading, setLoading] = useState(false)

  const currentGenreSlug = selectedGenres[currentGenreIdx]
  const genreData = GENRES.find(g => g.slug === currentGenreSlug)

  function toggleGenre(slug) { setSelectedGenres(p => p.includes(slug) ? p.filter(s => s !== slug) : [...p, slug]) }
  function setSubPath(gs, sp) { setSubPathSelections(p => ({ ...p, [gs]: sp })) }
  function setAnswer(gs, qid, idx) { setPlacementAnswers(p => ({ ...p, [gs]: { ...(p[gs] || {}), [qid]: idx } })) }

  function goToNextGenre() {
    if (currentGenreIdx < selectedGenres.length - 1) { setCurrentGenreIdx(i => i + 1); setStep(2) }
    else setStep(4)
  }

  async function finishOnboarding() {
    setLoading(true)
    try {
      const { data: genres } = await supabase.from('genres').select('id, slug')
      const { data: subPaths } = await supabase.from('sub_paths').select('id, slug, genre_id')
      const insertRows = selectedGenres.map(gs => {
        const genre = genres.find(g => g.slug === gs)
        const spSlug = subPathSelections[gs]
        const subPath = subPaths.find(sp => sp.slug === spSlug && sp.genre_id === genre.id)
        const questions = PLACEMENT_QUESTIONS[gs]
        const rank = questions ? determinePlacementRank(placementAnswers[gs] || {}, questions) : 'E'
        return { user_id: user.id, genre_id: genre.id, sub_path_id: subPath.id, current_rank: rank, placed_via: rank === 'E' ? 'grind' : 'placement', total_xp: 0, current_rank_xp: 0 }
      })
      await supabase.from('user_genre_progress').insert(insertRows)

      // Assign non-session quests (protein + weekly + gate)
      for (const gs of selectedGenres) {
        const genre = genres.find(g => g.slug === gs)
        const subPath = subPaths.find(sp => sp.slug === subPathSelections[gs] && sp.genre_id === genre.id)
        const { data: templates } = await supabase
          .from('quest_templates')
          .select('id, frequency')
          .eq('sub_path_id', subPath.id)
          .is('session_slug', null)
          .eq('is_active', true)
        if (templates?.length) {
          await supabase.from('user_quests').insert(templates.map(t => ({
            user_id: user.id, quest_template_id: t.id, status: 'active',
            expires_at: t.frequency === 'daily'
              ? new Date(new Date().setHours(23,59,59,999)).toISOString()
              : t.frequency === 'weekly'
              ? new Date(new Date(Date.now() + 7*86400000).setHours(23,59,59,999)).toISOString()
              : new Date(Date.now() + 365*86400000).toISOString()
          })))
        }
      }
      navigate('/dashboard')
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // WELCOME
  if (step === 0) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.12) 0%, transparent 70%)' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.2em', textShadow: '0 0 60px rgba(139,92,246,0.5)', marginBottom: '8px' }}>RISE</div>
        <div style={{ width: '60px', height: '2px', margin: '0 auto 32px', background: 'linear-gradient(90deg, transparent, var(--accent-purple), transparent)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: '16px' }}>THE SYSTEM HAS CHOSEN YOU</div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '40px' }}>You are about to enter a system that will push you beyond your limits. Choose your path. Complete your quests. Earn your rank. Only the dedicated reach SS.</p>
        <button onClick={() => setStep(1)} style={{ padding: '14px 40px', background: 'var(--accent-purple)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#fff', fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.15em', boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}>BEGIN →</button>
      </div>
    </div>
  )

  // GENRE SELECT
  if (step === 1) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', padding: '48px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <StepHeader title="CHOOSE YOUR PATHS" subtitle="Select the genres you want to pursue. Each is tracked independently with its own rank and quests." step="Step 1 of 3" />
      <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {GENRES.map(genre => {
          const isSel = selectedGenres.includes(genre.slug)
          return (
            <button key={genre.slug} onClick={() => toggleGenre(genre.slug)} style={{ width: '100%', padding: '20px', textAlign: 'left', background: isSel ? `${genre.color}15` : 'var(--bg-surface)', border: `1px solid ${isSel ? genre.color : 'var(--border-dim)'}`, borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isSel ? `0 0 20px ${genre.color}25` : 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>{genre.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: isSel ? genre.color : 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: '4px' }}>{genre.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{genre.description}</div>
              </div>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${isSel ? genre.color : 'var(--border-dim)'}`, background: isSel ? genre.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                {isSel && <Check size={14} color="#fff" />}
              </div>
            </button>
          )
        })}
      </div>
      <button onClick={() => { setCurrentGenreIdx(0); setStep(2) }} disabled={selectedGenres.length === 0} style={{ padding: '14px 48px', background: selectedGenres.length > 0 ? 'var(--accent-purple)' : 'var(--bg-elevated)', border: 'none', borderRadius: '10px', cursor: selectedGenres.length > 0 ? 'pointer' : 'not-allowed', color: selectedGenres.length > 0 ? '#fff' : 'var(--text-dim)', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', boxShadow: selectedGenres.length > 0 ? '0 0 24px rgba(139,92,246,0.35)' : 'none', transition: 'all 0.2s' }}>
        CONTINUE ({selectedGenres.length} selected)
      </button>
    </div>
  )

  // SUB-PATH
  if (step === 2 && genreData) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', padding: '48px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <StepHeader
        title={`${genreData.icon} ${genreData.name.toUpperCase()}`}
        subtitle={genreData.slug === 'fitness' ? 'Choose your training split. This determines the exact exercises you get each day.' : 'Choose your target distance. Your quests will build toward this goal.'}
        step={`Genre ${currentGenreIdx + 1} of ${selectedGenres.length} · Step 2 of 3`}
        color={genreData.color}
      />
      <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
        {genreData.subPaths.map(sp => {
          const isSel = subPathSelections[currentGenreSlug] === sp.slug
          return (
            <button key={sp.slug} onClick={() => setSubPath(currentGenreSlug, sp.slug)} style={{ padding: '16px', textAlign: 'left', background: isSel ? `${genreData.color}18` : 'var(--bg-surface)', border: `1px solid ${isSel ? genreData.color : 'var(--border-dim)'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: isSel ? genreData.color : 'var(--text-primary)', marginBottom: '3px' }}>{sp.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{sp.desc}</div>
              </div>
              {isSel && <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: genreData.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={13} color="#fff" /></div>}
            </button>
          )
        })}
      </div>
      <NavButtons onBack={() => currentGenreIdx === 0 ? setStep(1) : (setCurrentGenreIdx(i => i - 1), setStep(2))} onNext={() => setStep(3)} nextDisabled={!subPathSelections[currentGenreSlug]} nextLabel="NEXT →" />
    </div>
  )

  // PLACEMENT
  if (step === 3 && genreData) {
    const questions = PLACEMENT_QUESTIONS[currentGenreSlug]
    const answers = placementAnswers[currentGenreSlug] || {}
    const allAnswered = questions ? questions.every(q => answers[q.id] !== undefined) : true
    const placedRank = allAnswered && questions ? determinePlacementRank(answers, questions) : 'E'

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', padding: '48px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <StepHeader title="PLACEMENT TEST" subtitle={`Answer honestly — this sets your starting rank in ${genreData.name}.`} step={`Genre ${currentGenreIdx + 1} of ${selectedGenres.length} · Step 3 of 3`} color={genreData.color} />
        {questions ? (
          <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {questions.map((q, qi) => (
              <div key={q.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '14px', padding: '18px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', marginBottom: '8px' }}>Q{qi + 1}</div>
                <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '14px', lineHeight: 1.5 }}>{q.question}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, oi) => {
                    const isSel = answers[q.id] === oi
                    return <button key={oi} onClick={() => setAnswer(currentGenreSlug, q.id, oi)} style={{ padding: '10px 14px', textAlign: 'left', background: isSel ? `${genreData.color}18` : 'var(--bg-deep)', border: `1px solid ${isSel ? genreData.color : 'var(--border-dim)'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', fontSize: '13px', color: isSel ? genreData.color : 'var(--text-secondary)', fontWeight: isSel ? 600 : 400 }}>{opt}</button>
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {allAnswered && (
          <div style={{ width: '100%', maxWidth: '520px', marginBottom: '20px', padding: '14px 18px', background: `${RANK_COLORS[placedRank]}12`, border: `1px solid ${RANK_COLORS[placedRank]}40`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '8px', border: `2px solid ${RANK_COLORS[placedRank]}`, background: `${RANK_COLORS[placedRank]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: RANK_COLORS[placedRank], flexShrink: 0 }}>{placedRank}</div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Your starting rank</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: RANK_COLORS[placedRank], fontFamily: 'var(--font-display)' }}>{placedRank} — {RANK_NAMES[placedRank]}</div>
            </div>
          </div>
        )}
        <NavButtons onBack={() => setStep(2)} onNext={goToNextGenre} nextDisabled={!allAnswered} nextLabel={currentGenreIdx < selectedGenres.length - 1 ? 'NEXT GENRE →' : 'CONFIRM →'} />
      </div>
    )
  }

  // SUMMARY
  if (step === 4) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', padding: '48px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 60%)' }}>
      <StepHeader title="YOUR HUNTER PROFILE" subtitle="Review your setup. Your quests will be assigned on entry." step="Ready to begin" />
      <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
        {selectedGenres.map(gs => {
          const genre = GENRES.find(g => g.slug === gs)
          const subPath = genre.subPaths.find(sp => sp.slug === subPathSelections[gs])
          const questions = PLACEMENT_QUESTIONS[gs]
          const rank = questions ? determinePlacementRank(placementAnswers[gs] || {}, questions) : 'E'
          return (
            <div key={gs} style={{ background: 'var(--bg-surface)', border: `1px solid ${genre.color}40`, borderRadius: '14px', padding: '18px', boxShadow: `0 0 20px ${genre.color}10` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ fontSize: '26px' }}>{genre.icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: genre.color }}>{genre.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{subPath?.name}</div>
                </div>
                <div style={{ marginLeft: 'auto', width: '40px', height: '40px', borderRadius: '8px', border: `2px solid ${RANK_COLORS[rank]}`, background: `${RANK_COLORS[rank]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: RANK_COLORS[rank] }}>{rank}</div>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--bg-deep)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Starting at <strong style={{ color: RANK_COLORS[rank] }}>Rank {rank}</strong> — quests assigned on entry
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={finishOnboarding} disabled={loading} style={{ padding: '15px 60px', background: loading ? 'rgba(139,92,246,0.4)' : 'var(--accent-purple)', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.15em', boxShadow: loading ? 'none' : '0 0 30px rgba(139,92,246,0.4)' }}>
        {loading ? 'ENTERING SYSTEM...' : 'ENTER THE SYSTEM ⚡'}
      </button>
    </div>
  )

  return null
}