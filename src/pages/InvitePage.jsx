import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { Loader2 } from 'lucide-react'

export function InvitePage() {
  const { code } = useParams()
  const { user, loading } = useAuthStore()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [ownerName, setOwnerName] = useState('')

  useEffect(() => {
    if (!loading) {
      if (!user) { localStorage.setItem('pendingInvite', code); navigate('/auth') }
      else handleInvite()
    }
  }, [user, loading])

  async function handleInvite() {
    const { data, error } = await supabase.rpc('use_invite_link', { p_code: code, p_user_id: user.id })
    if (error || data?.error === 'invalid_link') { setStatus('error'); return }
    if (data?.error === 'self_invite') { setStatus('self'); return }
    if (data?.already_exists) { setStatus('exists'); setOwnerName(data.owner_username || ''); return }
    if (data?.success) { setStatus('success'); setOwnerName(data.owner_username || ''); return }
    setStatus('error')
  }

  const msgs = {
    loading: { emoji: '', title: 'Processing...', sub: 'One second...' },
    success: { emoji: '🎉', title: 'Request Sent!', sub: `Friend request sent to ${ownerName}. Once they accept you will be friends.` },
    exists: { emoji: '✓', title: 'Already Connected', sub: `You already have a connection with ${ownerName}.` },
    self: { emoji: '😅', title: "That's Your Own Link", sub: "You can't add yourself. Share this link with others." },
    error: { emoji: '❌', title: 'Invalid Link', sub: 'This invite link is invalid or expired.' },
  }
  const msg = msgs[status]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.08) 0%, transparent 70%)' }}>
      <div style={{ textAlign: 'center', maxWidth: '320px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.2em', marginBottom: '32px' }}>RISE</div>
        {status === 'loading' ? <Loader2 size={40} color="var(--accent-purple)" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} /> : <div style={{ fontSize: '48px', marginBottom: '16px' }}>{msg.emoji}</div>}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>{msg.title}</div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '32px' }}>{msg.sub}</p>
        {status !== 'loading' && <button onClick={() => navigate('/dashboard')} style={{ padding: '12px 36px', background: 'var(--accent-purple)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#fff', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>GO TO DASHBOARD</button>}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg);}to{transform:rotate(360deg);} }`}</style>
    </div>
  )
}