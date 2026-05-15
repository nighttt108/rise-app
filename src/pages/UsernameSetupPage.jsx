import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { Check, X, Loader2 } from 'lucide-react'

function validate(username) {
  if (username.length < 3) return 'At least 3 characters'
  if (username.length > 20) return 'Max 20 characters'
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Only letters, numbers, underscores'
  return null
}

export function UsernameSetupPage() {
  const { user, fetchProfile } = useAuthStore()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState(null) // null | true | false
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [debounceTimer, setDebounceTimer] = useState(null)

  const validationError = username.length > 0 ? validate(username) : null

  function handleChange(val) {
    setUsername(val)
    setAvailable(null)
    setError('')
    if (debounceTimer) clearTimeout(debounceTimer)
    if (val.length < 3 || validate(val)) return
    const timer = setTimeout(() => checkAvailability(val), 500)
    setDebounceTimer(timer)
  }

  async function checkAvailability(val) {
    setChecking(true)
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('username', val)
      .neq('id', user.id)
      .limit(1)
    setAvailable(!data || data.length === 0)
    setChecking(false)
  }

  async function handleSubmit() {
    const err = validate(username)
    if (err) { setError(err); return }
    if (!available) { setError('Username already taken'); return }
    setSaving(true)
    const { error: dbErr } = await supabase
      .from('users')
      .update({ username })
      .eq('id', user.id)
    if (dbErr) { setError('Something went wrong'); setSaving(false); return }
    await fetchProfile(user.id)
    // Check if onboarding done
    const { data: progress } = await supabase
      .from('user_genre_progress')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    navigate(progress?.length > 0 ? '/dashboard' : '/onboarding')
  }

  const showCheck = !validationError && username.length >= 3
  const canSubmit = showCheck && available && !checking && !saving

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-void)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 70%)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: 700,
          color: 'var(--accent-purple)', letterSpacing: '0.2em',
          textShadow: '0 0 40px rgba(139,92,246,0.4)', marginBottom: '8px'
        }}>RISE</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
          CHOOSE YOUR HUNTER NAME
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: 1.6 }}>
          This is how you appear on leaderboards and to other hunters. Choose wisely.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Input */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input
            value={username}
            onChange={e => handleChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="your_hunter_name"
            maxLength={20}
            autoFocus
            style={{
              width: '100%', padding: '14px 48px 14px 16px',
              background: 'var(--bg-surface)', border: `1px solid ${
                validationError ? 'rgba(239,68,68,0.4)' :
                available === true ? 'rgba(34,197,94,0.4)' :
                available === false ? 'rgba(239,68,68,0.4)' :
                'var(--border-dim)'
              }`,
              borderRadius: '12px', color: 'var(--text-primary)',
              fontSize: '16px', outline: 'none',
              fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
              transition: 'border-color 0.2s'
            }}
          />
          {/* Status icon */}
          <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
            {checking && <Loader2 size={18} color="var(--text-dim)" style={{ animation: 'spin 0.6s linear infinite' }} />}
            {!checking && available === true && <Check size={18} color="#22c55e" />}
            {!checking && (available === false || validationError) && username.length > 0 && <X size={18} color="#ef4444" />}
          </div>
        </div>

        {/* Status message */}
        <div style={{ height: '20px', marginBottom: '20px', fontSize: '12px', paddingLeft: '4px' }}>
          {validationError && username.length > 0 && (
            <span style={{ color: '#f87171' }}>{validationError}</span>
          )}
          {!validationError && available === false && (
            <span style={{ color: '#f87171' }}>Username already taken</span>
          )}
          {!validationError && available === true && (
            <span style={{ color: '#22c55e' }}>✓ Available</span>
          )}
          {!validationError && checking && (
            <span style={{ color: 'var(--text-dim)' }}>Checking...</span>
          )}
        </div>

        {/* Rules */}
        <div style={{
          padding: '12px 14px', background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)', borderRadius: '10px',
          marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
          {[
            { rule: '3–20 characters', ok: username.length >= 3 && username.length <= 20 },
            { rule: 'Letters, numbers, underscores only', ok: username.length > 0 && /^[a-zA-Z0-9_]+$/.test(username) },
            { rule: 'Unique across all hunters', ok: available === true },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: r.ok ? '#22c55e' : 'var(--text-dim)' }}>
              {r.ok ? <Check size={12} /> : <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid var(--border-dim)' }} />}
              {r.rule}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '14px',
            background: canSubmit ? 'var(--accent-purple)' : 'var(--bg-elevated)',
            border: 'none', borderRadius: '12px',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            color: canSubmit ? '#fff' : 'var(--text-dim)',
            fontSize: '15px', fontWeight: 700,
            fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
            boxShadow: canSubmit ? '0 0 24px rgba(139,92,246,0.35)' : 'none',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          {saving && <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />}
          {saving ? 'CLAIMING NAME...' : 'CLAIM YOUR NAME →'}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}