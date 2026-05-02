import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Account created! Check your email to verify, then log in.')
        setMode('login')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Check if user has completed onboarding
        const { data: progress } = await supabase
          .from('user_genre_progress')
          .select('id')
          .eq('user_id', data.user.id)
          .limit(1)
        if (!progress || progress.length === 0) {
          navigate('/onboarding')
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-void)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
      backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 70%)`
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '52px', fontWeight: 700,
          color: 'var(--accent-purple)', letterSpacing: '0.2em',
          textShadow: '0 0 40px rgba(139,92,246,0.4)'
        }}>RISE</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 500,
          color: 'var(--text-secondary)', letterSpacing: '0.3em', marginTop: '4px'
        }}>LEVEL UP YOUR REAL LIFE</div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-dim)',
        borderRadius: '16px', padding: '32px',
      }}>
        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg-deep)',
          borderRadius: '10px', padding: '4px',
          marginBottom: '28px'
        }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
              style={{
                flex: 1, padding: '8px', borderRadius: '7px', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
                transition: 'all 0.2s',
                background: mode === m ? 'var(--accent-purple)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-secondary)',
              }}>
              {m === 'login' ? 'LOG IN' : 'SIGN UP'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 600,
              fontFamily: 'var(--font-display)', color: 'var(--text-secondary)',
              letterSpacing: '0.1em', marginBottom: '8px'
            }}>EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="hunter@example.com"
              style={{
                width: '100%', padding: '12px 16px',
                background: 'var(--bg-deep)', border: '1px solid var(--border-dim)',
                borderRadius: '10px', color: 'var(--text-primary)',
                fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
                fontFamily: 'var(--font-body)'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-purple)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 600,
              fontFamily: 'var(--font-display)', color: 'var(--text-secondary)',
              letterSpacing: '0.1em', marginBottom: '8px'
            }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="Min. 6 characters"
                style={{
                  width: '100%', padding: '12px 44px 12px 16px',
                  background: 'var(--bg-deep)', border: '1px solid var(--border-dim)',
                  borderRadius: '10px', color: 'var(--text-primary)',
                  fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
                  fontFamily: 'var(--font-body)'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-purple)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex'
              }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '13px'
            }}>{error}</div>
          )}
          {success && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)',
              color: '#2dd4bf', fontSize: '13px'
            }}>{success}</div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px',
            background: loading ? 'rgba(139,92,246,0.4)' : 'var(--accent-purple)',
            border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
            color: '#fff', fontSize: '14px', fontWeight: 700,
            fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.2s', marginTop: '4px',
            boxShadow: loading ? 'none' : '0 0 20px rgba(139,92,246,0.3)'
          }}>
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? 'ENTER THE SYSTEM' : 'BEGIN YOUR RISE'}
          </button>
        </form>
      </div>

      <p style={{
        marginTop: '24px', fontSize: '12px', color: 'var(--text-dim)',
        fontFamily: 'var(--font-display)', letterSpacing: '0.05em'
      }}>
        YOUR JOURNEY STARTS HERE
      </p>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: var(--text-dim); }
      `}</style>
    </div>
  )
}