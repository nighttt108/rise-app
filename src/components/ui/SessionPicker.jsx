import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { X, CheckCircle2 } from 'lucide-react'

const SESSION_CONFIG = {
  'ppl': [
    { slug: 'push', label: 'Push Day', desc: 'Chest · Shoulders · Triceps', color: '#8b5cf6' },
    { slug: 'pull', label: 'Pull Day', desc: 'Back · Biceps', color: '#3b82f6' },
    { slug: 'legs', label: 'Leg Day', desc: 'Quads · Hamstrings · Calves', color: '#22c55e' },
  ],
  'bro-split': [
    { slug: 'chest', label: 'Chest', desc: 'Flat · Incline · Cables', color: '#8b5cf6' },
    { slug: 'back', label: 'Back', desc: 'Deadlifts · Rows · Pulldowns', color: '#3b82f6' },
    { slug: 'shoulders', label: 'Shoulders', desc: 'Press · Raises · Shrugs', color: '#f59e0b' },
    { slug: 'legs', label: 'Legs', desc: 'Squats · Lunges · Curls', color: '#22c55e' },
    { slug: 'arms', label: 'Arms', desc: 'Biceps · Triceps', color: '#ef4444' },
  ],
  'synergistic': [
    { slug: 'chest-tri', label: 'Chest & Triceps', desc: 'Pushing muscles', color: '#8b5cf6' },
    { slug: 'back-bi', label: 'Back & Biceps', desc: 'Pulling muscles', color: '#3b82f6' },
    { slug: 'legs', label: 'Legs', desc: 'Full lower body', color: '#22c55e' },
    { slug: 'shoulders-core', label: 'Shoulders & Core', desc: 'Overhead & stability', color: '#f59e0b' },
  ],
  'endurance': [
    { slug: 'circuit-a', label: 'Circuit A', desc: 'Full body stamina', color: '#14b8a6' },
    { slug: 'circuit-b', label: 'Circuit B', desc: 'Strength endurance', color: '#3b82f6' },
    { slug: 'circuit-c', label: 'Circuit C', desc: 'Metabolic conditioning', color: '#f59e0b' },
  ],
  'power': [
    { slug: 'lower-power', label: 'Lower Body Power', desc: 'Box jumps · Cleans · Sprints', color: '#ef4444' },
    { slug: 'upper-power', label: 'Upper Body Power', desc: 'Speed bench · Explosive pulls', color: '#8b5cf6' },
    { slug: 'full-power', label: 'Full Body Power', desc: 'KB snatches · Push press · Sprints', color: '#f59e0b' },
  ],
  'cardio': [
    { slug: 'hiit', label: 'HIIT', desc: '30s sprint / 60s rest × 10–12', color: '#ef4444' },
    { slug: 'liss', label: 'LISS', desc: '45–60 min Zone 2 steady state', color: '#22c55e' },
    { slug: 'tempo', label: 'Tempo', desc: '30–40 min Zone 3–4 threshold', color: '#f59e0b' },
    { slug: 'recovery', label: 'Active Recovery', desc: '20–30 min Zone 1 mobility', color: '#14b8a6' },
  ],
}

export function SessionPicker({ progress, userId, onSessionPicked, onClose }) {
  const subPathSlug = progress?.sub_paths?.slug
  const sessions = SESSION_CONFIG[subPathSlug] || []
  const [selecting, setSelecting] = useState(null)
  const today = new Date().toISOString().split('T')[0]
  const [todaySession, setTodaySession] = useState(
    progress?.last_session_date === today ? progress?.last_session_slug : null
  )

  console.log('SessionPicker mounted:', { subPathSlug, subPathId: progress?.sub_path_id, sessions: sessions.length })

  async function pickSession(session) {
    setSelecting(session.slug)
    console.log('Picking session:', session.slug, 'sub_path_id:', progress.sub_path_id)

    try {
      // Step 1: Get all session template ids for this sub_path first
      const { data: allSessionTemplates, error: allErr } = await supabase
        .from('quest_templates')
        .select('id')
        .eq('sub_path_id', progress.sub_path_id)
        .eq('frequency', 'daily')
        .not('session_slug', 'is', null)

      console.log('All session templates:', allSessionTemplates?.length, allErr)

      // Step 2: Expire existing active ones
      if (allSessionTemplates?.length > 0) {
        const ids = allSessionTemplates.map(t => t.id)
        const { error: expireErr } = await supabase
          .from('user_quests')
          .update({ status: 'expired' })
          .eq('user_id', userId)
          .eq('status', 'active')
          .in('quest_template_id', ids)

        console.log('Expire result:', expireErr || 'ok')
      }

      // Step 3: Fetch templates for picked session only
      const { data: templates, error: tErr } = await supabase
        .from('quest_templates')
        .select('id, title, session_slug')
        .eq('sub_path_id', progress.sub_path_id)
        .eq('session_slug', session.slug)
        .eq('is_active', true)

      console.log('Templates for session:', session.slug, templates, tErr)

      if (tErr || !templates?.length) {
        console.error('No templates found:', tErr)
        setSelecting(null)
        return
      }

      // Step 4: Insert new quests
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      const toInsert = templates.map(t => ({
        user_id: userId,
        quest_template_id: t.id,
        session_slug: session.slug,
        status: 'active',
        assigned_at: new Date().toISOString(),
        expires_at: endOfDay.toISOString(),
      }))

      console.log('Inserting:', toInsert.length, 'quests')

      const { data: inserted, error: insertErr } = await supabase
        .from('user_quests')
        .insert(toInsert)
        .select()

      console.log('Inserted:', inserted, insertErr)

      if (insertErr) {
        console.error('Insert failed:', insertErr)
        setSelecting(null)
        return
      }

      // Step 5: Update progress
      const { error: progErr } = await supabase
        .from('user_genre_progress')
        .update({ last_session_slug: session.slug, last_session_date: today })
        .eq('id', progress.id)

      console.log('Progress update:', progErr || 'ok')

      setTodaySession(session.slug)
      setSelecting(null)
      onSessionPicked(session)

    } catch (err) {
      console.error('pickSession crashed:', err)
      setSelecting(null)
    }
  }

  if (!sessions.length) {
    console.warn('No sessions for subPathSlug:', subPathSlug)
    return null
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', padding: '24px', animation: 'fadeUp 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
            WHAT ARE YOU TRAINING?
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Pick today's session — your quests will update instantly.
          {todaySession && <span style={{ color: 'var(--accent-purple)', marginLeft: '6px' }}>Switching replaces today's session.</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
          {sessions.map(session => {
            const isToday = todaySession === session.slug
            const isLoading = selecting === session.slug
            return (
              <button key={session.slug} onClick={() => pickSession(session)} disabled={!!selecting}
                style={{ padding: '14px 16px', background: isToday ? `${session.color}15` : 'var(--bg-deep)', border: `1px solid ${isToday ? session.color : 'var(--border-dim)'}`, borderRadius: '12px', cursor: selecting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.15s', opacity: selecting && !isLoading ? 0.5 : 1 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: session.color, flexShrink: 0, boxShadow: `0 0 8px ${session.color}60` }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: isToday ? session.color : 'var(--text-primary)', marginBottom: '2px' }}>{session.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{session.desc}</div>
                </div>
                {isLoading && <div style={{ width: '18px', height: '18px', border: `2px solid ${session.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
                {isToday && !isLoading && <CheckCircle2 size={18} color={session.color} />}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '12px' }}>
          Rest day? Just close this — no action needed.
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg);}to{transform:rotate(360deg);} } @keyframes fadeUp { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }`}</style>
    </div>
  )
}