import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { RANK_COLORS, RANK_NAMES } from '../lib/xp'
import { Search, UserPlus, Link, Check, X, Clock, Copy, Users, Trophy } from 'lucide-react'

const GENRE_ICONS = { fitness: '⚔️', running: '🏃', study: '📖' }

export function FriendsPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('friends') // friends | requests | search | leaderboard
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([]) // incoming pending
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [inviteCode, setInviteCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [friendsProgress, setFriendsProgress] = useState([])
  const [activeGenre, setActiveGenre] = useState('fitness')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (tab === 'leaderboard') fetchFriendsProgress() }, [tab, friends])

  async function fetchAll() {
    setLoading(true)
    const [{ data: fReqs }] = await Promise.all([
      supabase.from('friend_requests')
        .select('*, sender:sender_id(id,username,avatar_url), receiver:receiver_id(id,username,avatar_url)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    ])

    if (fReqs) {
      const accepted = fReqs.filter(r => r.status === 'accepted').map(r => ({
        ...r,
        friend: r.sender_id === user.id ? r.receiver : r.sender
      }))
      const incoming = fReqs.filter(r => r.status === 'pending' && r.receiver_id === user.id)
      setFriends(accepted)
      setRequests(incoming)
    }
    setLoading(false)
  }

  async function fetchFriendsProgress() {
    if (!friends.length) return
    const friendIds = friends.map(f => f.friend.id)
    const { data: genres } = await supabase.from('genres').select('id,slug,name').eq('is_active', true)
    const activeGenreData = genres?.find(g => g.slug === activeGenre)
    if (!activeGenreData) return

    const { data: prog } = await supabase
      .from('user_genre_progress')
      .select('*, users(username), sub_paths(name)')
      .in('user_id', [...friendIds, user.id])
      .eq('genre_id', activeGenreData.id)
      .order('total_xp', { ascending: false })

    if (prog) setFriendsProgress(prog)
  }

  async function getInviteLink() {
    const { data } = await supabase.rpc('get_or_create_invite_link', { p_user_id: user.id })
    setInviteCode(data)
  }

  async function copyInviteLink() {
    const link = `${window.location.origin}/invite/${inviteCode}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function searchUsers(q) {
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .ilike('username', `%${q}%`)
      .neq('id', user.id)
      .limit(10)

    // Enrich with friend status
    const { data: reqs } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

    const enriched = (data || []).map(u => {
      const req = reqs?.find(r =>
        (r.sender_id === user.id && r.receiver_id === u.id) ||
        (r.sender_id === u.id && r.receiver_id === user.id)
      )
      return { ...u, requestStatus: req?.status || null, requestId: req?.id, isSender: req?.sender_id === user.id }
    })
    setSearchResults(enriched)
    setSearching(false)
  }

  async function sendRequest(receiverId) {
    setActionLoading(receiverId)
    await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: receiverId })
    showToast('Friend request sent!')
    searchUsers(searchQuery)
    setActionLoading(null)
  }

  async function acceptRequest(requestId) {
    setActionLoading(requestId)
    await supabase.from('friend_requests').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', requestId)
    showToast('Friend added! 🎉', '#22c55e')
    fetchAll()
    setActionLoading(null)
  }

  async function declineRequest(requestId) {
    setActionLoading(requestId)
    await supabase.from('friend_requests').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', requestId)
    fetchAll()
    setActionLoading(null)
  }

  async function removeFriend(requestId) {
    setActionLoading(requestId)
    await supabase.from('friend_requests').delete().eq('id', requestId)
    showToast('Friend removed')
    fetchAll()
    setActionLoading(null)
  }

  function showToast(msg, color = 'var(--accent-purple)') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2500)
  }

  const GENRE_TABS = [
    { slug: 'fitness', name: 'Fitness', icon: '⚔️' },
    { slug: 'running', name: 'Running', icon: '🏃' },
    { slug: 'study', name: 'Study', icon: '📖' },
  ]

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '32px' }}>

      {toast && (
        <div style={{ position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)', background: toast.color, color: '#fff', padding: '10px 20px', borderRadius: '40px', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)', zIndex: 100, whiteSpace: 'nowrap', animation: 'fadeUp 0.3s ease' }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: '4px' }}>FRIENDS</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{friends.length} mutual friends</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { id: 'friends', label: 'Friends', icon: <Users size={14} /> },
          { id: 'requests', label: `Requests${requests.length > 0 ? ` (${requests.length})` : ''}`, icon: <UserPlus size={14} /> },
          { id: 'search', label: 'Find', icon: <Search size={14} /> },
          { id: 'leaderboard', label: 'Vs Friends', icon: <Trophy size={14} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: '20px',
            border: `1px solid ${tab === t.id ? 'var(--accent-purple)' : 'var(--border-dim)'}`,
            background: tab === t.id ? 'var(--accent-purple-dim)' : 'var(--bg-surface)',
            color: tab === t.id ? 'var(--accent-purple)' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* FRIENDS TAB */}
      {tab === 'friends' && (
        <div>
          {/* Invite link section */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link size={14} color="var(--accent-purple)" /> YOUR INVITE LINK
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Share this link — when someone opens it, they send you a friend request automatically.</div>
            {!inviteCode ? (
              <button onClick={getInviteLink} style={{ width: '100%', padding: '10px', background: 'var(--accent-purple-dim)', border: '1px solid var(--border-glow)', borderRadius: '8px', cursor: 'pointer', color: 'var(--accent-purple)', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                GENERATE MY LINK
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border-dim)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {window.location.origin}/invite/{inviteCode}
                </div>
                <button onClick={copyInviteLink} style={{ padding: '10px 14px', background: copied ? 'rgba(34,197,94,0.15)' : 'var(--accent-purple-dim)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border-glow)'}`, borderRadius: '8px', cursor: 'pointer', color: copied ? '#22c55e' : 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
                  {copied ? <><Check size={13} /> COPIED</> : <><Copy size={13} /> COPY</>}
                </button>
              </div>
            )}
          </div>

          {/* Friends list */}
          {loading ? (
            [1,2,3].map(i => <div key={i} style={{ height: '72px', background: 'var(--bg-surface)', borderRadius: '12px', marginBottom: '8px' }} className="shimmer" />)
          ) : friends.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>NO FRIENDS YET</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Search for hunters or share your invite link to add friends.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {friends.map(f => (
                <FriendCard key={f.id} friend={f.friend} requestId={f.id} onRemove={removeFriend} loading={actionLoading === f.id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* REQUESTS TAB */}
      {tab === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>NO PENDING REQUESTS</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Share your invite link or search for hunters to connect.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {requests.map(r => (
                <div key={r.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar username={r.sender?.username} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{r.sender?.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> Wants to be your friend</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => acceptRequest(r.id)} disabled={actionLoading === r.id}
                      style={{ padding: '8px 14px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', cursor: 'pointer', color: '#22c55e', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={13} /> ACCEPT
                    </button>
                    <button onClick={() => declineRequest(r.id)} disabled={actionLoading === r.id}
                      style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEARCH TAB */}
      {tab === 'search' && (
        <div>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); searchUsers(e.target.value) }}
              placeholder="Search by username..."
              style={{ width: '100%', padding: '12px 14px 12px 40px', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-body)' }}
              autoFocus
            />
          </div>

          {searching && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '13px' }}>Searching...</div>}

          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>No hunters found with that username.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {searchResults.map(u => (
              <div key={u.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar username={u.username} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{u.username}</div>
                </div>
                {u.requestStatus === 'accepted' ? (
                  <span style={{ fontSize: '12px', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>✓ FRIENDS</span>
                ) : u.requestStatus === 'pending' ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {u.isSender ? 'SENT' : 'INCOMING'}
                  </span>
                ) : (
                  <button onClick={() => sendRequest(u.id)} disabled={actionLoading === u.id}
                    style={{ padding: '8px 14px', background: 'var(--accent-purple-dim)', border: '1px solid var(--border-glow)', borderRadius: '8px', cursor: 'pointer', color: 'var(--accent-purple)', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <UserPlus size={13} /> ADD
                  </button>
                )}
              </div>
            ))}
          </div>

          {searchQuery.length < 2 && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <Search size={32} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Type at least 2 characters to search hunters by username.</div>
            </div>
          )}
        </div>
      )}

      {/* FRIENDS LEADERBOARD TAB */}
      {tab === 'leaderboard' && (
        <div>
          {friends.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>ADD FRIENDS FIRST</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Your friends leaderboard appears here once you have mutual friends.</div>
            </div>
          ) : (
            <>
              {/* Genre tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {GENRE_TABS.map(g => (
                  <button key={g.slug} onClick={() => { setActiveGenre(g.slug); fetchFriendsProgress() }}
                    style={{ flex: 1, padding: '8px', borderRadius: '10px', border: `1px solid ${activeGenre === g.slug ? 'var(--accent-purple)' : 'var(--border-dim)'}`, background: activeGenre === g.slug ? 'var(--accent-purple-dim)' : 'var(--bg-surface)', color: activeGenre === g.slug ? 'var(--accent-purple)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                    {g.icon} {g.name}
                  </button>
                ))}
              </div>

              {friendsProgress.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '14px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  None of your friends have joined this genre yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {friendsProgress.map((p, i) => {
                    const isMe = p.user_id === user.id
                    const color = RANK_COLORS[p.current_rank]
                    const pos = i + 1
                    const posColors = { 1: '#f59e0b', 2: '#9ca3af', 3: '#cd7c3a' }
                    const uname = p.users?.username || 'Hunter'
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: isMe ? 'var(--accent-purple-dim)' : 'var(--bg-surface)', border: `1px solid ${isMe ? 'var(--border-glow)' : 'var(--border-dim)'}`, borderRadius: '12px' }}>
                        <div style={{ width: '28px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: posColors[pos] || 'var(--text-dim)', flexShrink: 0 }}>
                          {pos <= 3 ? ['🥇','🥈','🥉'][pos-1] : `#${pos}`}
                        </div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '7px', border: `1.5px solid ${color}`, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color, flexShrink: 0 }}>
                          {p.current_rank}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: isMe ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
                            {isMe ? 'YOU' : uname}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{p.sub_paths?.name} · {p.streak_days}d streak</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: isMe ? 'var(--accent-purple)' : 'var(--text-primary)' }}>{p.total_xp.toLocaleString()}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>XP</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Avatar({ username, size = 40 }) {
  const colors = ['#8b5cf6','#14b8a6','#f59e0b','#ef4444','#3b82f6','#22c55e']
  const color = colors[(username?.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, background: `${color}20`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: size * 0.4, fontWeight: 700, color, flexShrink: 0 }}>
      {username?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function FriendCard({ friend, requestId, onRemove, loading }) {
  const [showRemove, setShowRemove] = useState(false)
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Avatar username={friend?.username} size={44} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{friend?.username}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={10} color="#22c55e" /> Mutual friends</div>
      </div>
      {!showRemove ? (
        <button onClick={() => setShowRemove(true)} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--border-dim)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '12px' }}>•••</button>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setShowRemove(false)} style={{ padding: '7px 10px', background: 'transparent', border: '1px solid var(--border-dim)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '12px' }}>Cancel</button>
          <button onClick={() => onRemove(requestId)} disabled={loading} style={{ padding: '7px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', color: '#f87171', fontSize: '12px', fontWeight: 600 }}>Remove</button>
        </div>
      )}
    </div>
  )
}