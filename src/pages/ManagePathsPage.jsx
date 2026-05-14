import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { RANK_COLORS } from '../lib/xp'
import { ChevronLeft, Plus, Trash2, RefreshCw, Check, AlertTriangle } from 'lucide-react'

const GENRE_ICONS = { fitness: '⚔️', running: '🏃', study: '📖' }
const ALL_GENRES = [
  { slug: 'fitness', name: 'Fitness', icon: '⚔️', subPaths: [
    { slug: 'bulk', name: 'Bulk', desc: 'Build maximum muscle mass' },
    { slug: 'cut', name: 'Cut', desc: 'Lose fat, preserve muscle' },
    { slug: 'endurance', name: 'Endurance', desc: 'Cardiovascular capacity' },
    { slug: 'calisthenics', name: 'Calisthenics', desc: 'Bodyweight mastery' },
  ]},
  { slug: 'running', name: 'Running', icon: '🏃', subPaths: [
    { slug: '5k', name: '5K', desc: 'Build up and improve your time' },
    { slug: '10k', name: '10K', desc: 'Train for 10K' },
    { slug: 'half-marathon', name: 'Half Marathon', desc: 'Conquer 21.1km' },
    { slug: 'marathon', name: 'Marathon', desc: 'The ultimate 42.2km test' },
  ]},
  { slug: 'study', name: 'Study', icon: '📖', subPaths: [
    { slug: 'exam-prep', name: 'Exam Prep', desc: 'Systematic exam prep' },
    { slug: 'language', name: 'Language', desc: 'Learn a new language' },
    { slug: 'skill-building', name: 'Skill Building', desc: 'Master a professional skill' },
  ]},
]

function SectionLabel({ children }) {
  return <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.2em', marginBottom: '10px' }}>{children}</div>
}

function Modal({ children, onClose }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', padding: '24px', animation: 'fadeUp 0.25s ease' }}>
        {children}
      </div>
    </div>
  )
}

function ModalBtn({ children, onClick, disabled, secondary, danger }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ flex: secondary ? 0 : 1, padding: '12px 20px', background: danger ? 'rgba(239,68,68,0.15)' : secondary ? 'transparent' : 'var(--accent-purple)', border: `1px solid ${danger ? 'rgba(239,68,68,0.4)' : secondary ? 'var(--border-dim)' : 'transparent'}`, borderRadius: '10px', cursor: disabled ? 'not-allowed' : 'pointer', color: danger ? '#f87171' : secondary ? 'var(--text-secondary)' : '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.05em', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

export function ManagePathsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [progress, setProgress] = useState([])
  const [subPaths, setSubPaths] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null)
  const [selectedSubPath, setSelectedSubPath] = useState(null)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: prog }, { data: g }, { data: sp }] = await Promise.all([
      supabase.from('user_genre_progress').select('*, genres(name,slug), sub_paths(name,slug)').eq('user_id', user.id),
      supabase.from('genres').select('*').eq('is_active', true),
      supabase.from('sub_paths').select('*'),
    ])
    if (prog) setProgress(prog)
    if (g) setGenres(g)
    if (sp) setSubPaths(sp)
    setLoading(false)
  }

  function showToast(msg, color = 'var(--accent-purple)') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2500)
  }

  async function handleSwitchSubPath() {
    if (!selectedSubPath || !modal?.data?.genreId) return
    setSaving(true)
    const { error } = await supabase.rpc('switch_sub_path', { p_user_id: user.id, p_genre_id: modal.data.genreId, p_new_sub_path_id: selectedSubPath })
    setSaving(false); setModal(null)
    if (!error) { showToast('Path switched! New quests assigned.'); fetchAll() }
    else showToast('Something went wrong', '#ef4444')
  }

  async function handleDropGenre() {
    if (!modal?.data?.genreId) return
    setSaving(true)
    const { error } = await supabase.rpc('drop_genre', { p_user_id: user.id, p_genre_id: modal.data.genreId })
    setSaving(false); setModal(null)
    if (!error) { showToast('Genre dropped. XP drains after 7 days.', '#f59e0b'); fetchAll() }
    else showToast('Something went wrong', '#ef4444')
  }

  async function handleRejoin(genreId, subPathId, rank) {
    setSaving(true)
    const { error } = await supabase.rpc('add_genre', { p_user_id: user.id, p_genre_id: genreId, p_sub_path_id: subPathId, p_start_rank: rank })
    setSaving(false)
    if (!error) { showToast('Welcome back! Drain stopped.', '#22c55e'); fetchAll() }
    else showToast('Something went wrong', '#ef4444')
  }

  async function handleAddGenre() {
    if (!selectedGenre || !selectedSubPath) return
    setSaving(true)
    const genre = genres.find(g => g.slug === selectedGenre)
    const { error } = await supabase.rpc('add_genre', { p_user_id: user.id, p_genre_id: genre.id, p_sub_path_id: selectedSubPath, p_start_rank: 'E' })
    setSaving(false); setModal(null)
    if (!error) { showToast('New genre added!'); fetchAll() }
    else showToast('Something went wrong', '#ef4444')
  }

  const activeProgress = progress.filter(p => p.is_active !== false)
  const droppedProgress = progress.filter(p => p.is_active === false)
  const activeGenreSlugs = progress.map(p => p.genres?.slug)
  const availableToAdd = ALL_GENRES.filter(g => !activeGenreSlugs.includes(g.slug))

  if (loading) return <div style={{ padding: '20px' }}>{[1,2].map(i => <div key={i} style={{ height: '100px', background: 'var(--bg-surface)', borderRadius: '14px', marginBottom: '10px' }} className="shimmer" />)}</div>

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}>
      {toast && <div style={{ position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)', background: toast.color, color: '#fff', padding: '10px 20px', borderRadius: '40px', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)', zIndex: 100, whiteSpace: 'nowrap', animation: 'fadeUp 0.3s ease' }}>{toast.msg}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><ChevronLeft size={22} /></button>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>MANAGE PATHS</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Switch paths, add genres, or drop and rejoin</div>
        </div>
      </div>

      <SectionLabel>ACTIVE PATHS</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {activeProgress.map(p => {
          const color = RANK_COLORS[p.current_rank]
          return (
            <div key={p.id} style={{ background: 'var(--bg-surface)', border: `1px solid ${color}25`, borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{ fontSize: '26px' }}>{GENRE_ICONS[p.genres?.slug]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.genres?.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Currently: <span style={{ color, fontWeight: 600 }}>{p.sub_paths?.name}</span> · Rank {p.current_rank}</div>
                </div>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', border: `2px solid ${color}`, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color }}>{p.current_rank}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setModal({ type: 'switch', data: { genreId: p.genre_id, genreSlug: p.genres?.slug, currentSubPath: p.sub_path_id } }); setSelectedSubPath(p.sub_path_id) }}
                  style={{ flex: 1, padding: '9px', background: `${color}12`, border: `1px solid ${color}30`, borderRadius: '9px', cursor: 'pointer', color, fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <RefreshCw size={13} /> SWITCH PATH
                </button>
                <button onClick={() => setModal({ type: 'drop', data: { genreId: p.genre_id, genreName: p.genres?.name, rank: p.current_rank } })}
                  style={{ padding: '9px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '9px', cursor: 'pointer', color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Trash2 size={13} /> DROP
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {droppedProgress.length > 0 && (
        <>
          <SectionLabel>DROPPED PATHS</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {droppedProgress.map(p => {
              const color = RANK_COLORS[p.current_rank]
              const daysSince = p.dropped_at ? Math.floor((Date.now() - new Date(p.dropped_at)) / 86400000) : 0
              const draining = daysSince > 7
              return (
                <div key={p.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '16px', padding: '16px', opacity: 0.85 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '26px', filter: 'grayscale(0.5)' }}>{GENRE_ICONS[p.genres?.slug]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>{p.genres?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Rank {p.current_rank} · {p.total_xp.toLocaleString()} XP</div>
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', marginBottom: '12px', borderRadius: '8px', background: draining ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${draining ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, fontSize: '12px', color: draining ? '#f87171' : '#f59e0b' }}>
                    {draining ? `⚠ XP draining 2%/day — floor is 1 rank below Rank ${p.current_rank}` : `⏳ Grace period — drain starts in ${7 - daysSince} day${7 - daysSince !== 1 ? 's' : ''}`}
                  </div>
                  <button onClick={() => handleRejoin(p.genre_id, p.sub_path_id, p.current_rank)} disabled={saving}
                    style={{ width: '100%', padding: '9px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '9px', cursor: 'pointer', color: '#22c55e', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <RefreshCw size={13} /> REJOIN — STOP DRAIN
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {availableToAdd.length > 0 && (
        <>
          <SectionLabel>ADD A NEW PATH</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableToAdd.map(genre => (
              <button key={genre.slug} onClick={() => { setModal({ type: 'add', data: { genreSlug: genre.slug } }); setSelectedGenre(genre.slug); setSelectedSubPath(null) }}
                style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '28px' }}>{genre.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{genre.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{genre.subPaths.length} paths available</div>
                </div>
                <Plus size={18} color="var(--text-dim)" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Switch modal */}
      {modal?.type === 'switch' && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>SWITCH PATH</div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>XP and rank carry over. Only your quests will change.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {ALL_GENRES.find(g => g.slug === modal.data.genreSlug)?.subPaths.map(sp => {
              const dbSp = subPaths.find(s => s.slug === sp.slug)
              const isCurrent = dbSp?.id === modal.data.currentSubPath
              const isSelected = dbSp?.id === selectedSubPath
              return (
                <button key={sp.slug} onClick={() => dbSp && setSelectedSubPath(dbSp.id)}
                  style={{ padding: '12px 14px', textAlign: 'left', borderRadius: '10px', background: isSelected ? 'var(--accent-purple-dim)' : 'var(--bg-deep)', border: `1px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-dim)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{sp.name} {isCurrent && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(current)</span>}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sp.desc}</div>
                  </div>
                  {isSelected && <Check size={16} color="var(--accent-purple)" />}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <ModalBtn onClick={() => setModal(null)} secondary>Cancel</ModalBtn>
            <ModalBtn onClick={handleSwitchSubPath} disabled={saving || selectedSubPath === modal.data.currentSubPath}>{saving ? 'Switching...' : 'CONFIRM'}</ModalBtn>
          </div>
        </Modal>
      )}

      {/* Drop modal */}
      {modal?.type === 'drop' && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: '#ef4444', marginBottom: '12px' }}>DROP {modal.data.genreName?.toUpperCase()}</div>
          <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '13px', color: '#f87171', lineHeight: 1.6 }}>
              Your Rank {modal.data.rank} progress is saved. After 7 days, XP drains 2% per day — stopping 1 rank below where you are now. Rejoin anytime to stop.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <ModalBtn onClick={() => setModal(null)} secondary>Keep it</ModalBtn>
            <ModalBtn onClick={handleDropGenre} disabled={saving} danger>{saving ? 'Dropping...' : 'DROP GENRE'}</ModalBtn>
          </div>
        </Modal>
      )}

      {/* Add genre modal */}
      {modal?.type === 'add' && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {ALL_GENRES.find(g => g.slug === modal.data.genreSlug)?.icon} ADD {modal.data.genreSlug?.toUpperCase()}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Choose your starting path. You will begin at E rank.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {ALL_GENRES.find(g => g.slug === modal.data.genreSlug)?.subPaths.map(sp => {
              const dbSp = subPaths.find(s => s.slug === sp.slug)
              const isSelected = dbSp?.id === selectedSubPath
              return (
                <button key={sp.slug} onClick={() => dbSp && setSelectedSubPath(dbSp.id)}
                  style={{ padding: '12px 14px', textAlign: 'left', borderRadius: '10px', background: isSelected ? 'var(--accent-purple-dim)' : 'var(--bg-deep)', border: `1px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-dim)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{sp.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sp.desc}</div>
                  </div>
                  {isSelected && <Check size={16} color="var(--accent-purple)" />}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <ModalBtn onClick={() => setModal(null)} secondary>Cancel</ModalBtn>
            <ModalBtn onClick={handleAddGenre} disabled={saving || !selectedSubPath}>{saving ? 'Adding...' : 'ADD GENRE'}</ModalBtn>
          </div>
        </Modal>
      )}
    </div>
  )
}