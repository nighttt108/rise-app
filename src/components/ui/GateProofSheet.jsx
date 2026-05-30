import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Upload, Link, Loader2, CheckCircle2 } from 'lucide-react'

export function GateProofSheet({ quest, userId, onSubmitted, onClose }) {
  const [mode, setMode] = useState('link') // 'link' | 'upload'
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // FIXED: Added assignment operator and fallback string
  const questTitle = quest?.quest_templates?.title || 'Unknown Quest'

  async function handleSubmit() {
    if (mode === 'link' && !link.trim()) { 
      setError('Please paste a link to your proof'); 
      return 
    }
    if (mode === 'upload' && !file) { 
      setError('Please select a file to upload');
      return 
    }
    
    setSubmitting(true)
    setError('')
    
    try {
      let proofUrl = null
      
      if (mode === 'upload' && file) {
        const ext = file.name.split('.').pop()
        // FIXED: Replaced single quote with backtick
        const path = `gate-proofs/${userId}/${quest.id}.${ext}`
        
        const { error: uploadErr } = await supabase.storage
          .from('proofs')
          .upload(path, file, { upsert: true })
          
        if (uploadErr) { 
          // FIXED: Added closing quote to string
          setError('Upload failed: ' + uploadErr.message);
          setSubmitting(false); 
          return 
        }
        
        const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path)
        proofUrl = urlData.publicUrl
      }
      
      const { data, error: rpcErr } = await supabase.rpc('submit_gate_proof', {
        p_user_quest_id: quest.id,
        p_user_id: userId,
        p_proof_type: mode,
        p_proof_url: proofUrl,
        p_proof_link: mode === 'link' ? link.trim() : null,
        p_note: note.trim() || null,
      })
      
      if (rpcErr || data?.error) {
        setError(rpcErr?.message || data?.error || 'Submission failed')
        setSubmitting(false)
        return
      }
      
      onSubmitted()
    } catch (err) {
      setError('Something went wrong. Try again.')
      setSubmitting(false)
    }
  }

  return (
    // FIXED: Added missing starting quotes to style values throughout the JSX
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      
      {/* FIXED: camelCased overflowY */}
      <div style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em', marginBottom: '4px' }}>
              SUBMIT PROOF
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '380px' }}>
              {questTitle}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', flexShrink: 0, marginLeft: '12px' }}>
            <X size={20} />
          </button>
        </div>

        {/* How it works */}
        <div style={{ padding: '12px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', marginBottom: '20px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Your proof will be reviewed by hunters at your rank or above. <strong style={{ color: 'var(--accent-purple)' }}>1 approval</strong> unlocks your rank-up instantly.
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-deep)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
          {[
            { id: 'link', icon: <Link size={14} />, label: 'Paste Link' },
            { id: 'upload', icon: <Upload size={14} />, label: 'Upload File' },
          ].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setError('') }} style={{ flex: 1, padding: '19px', borderRadius: '17px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', background: mode === m.id ? 'var(--accent-purple)' : 'transparent', color: mode === m.id ? '#fff' : 'var(--text-secondary)' }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Link input */}
        {mode === 'link' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '8px' }}>
              VIDEO OR PHOTO LINK
            </label>
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="YouTube, Google Drive, Instagram, Twitter..."
              style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-deep)', border: '1px solid var(--border-dim)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-body)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-purple)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
              Make sure the link is publicly accessible before submitting.
            </div>
          </div>
        )}

        {/* File upload */}
        {mode === 'upload' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '8px' }}>
              PHOTO OR VIDEO FILE
            </label>
            
            {/* FIXED: Proper template literal for dynamic style property */}
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px', background: 'var(--bg-deep)', border: `2px dashed ${file ? 'var(--accent-purple)' : 'var(--border-dim)'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
              {file ? (
                <>
                  <CheckCircle2 size={28} color="var(--accent-purple)" />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-purple)' }}>{file.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB tap to change
                  </div>
                </>
              ) : (
                <>
                  <Upload size={28} color="var(--text-dim)" />
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tap to select photo or video</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>JPG, PNG, MP4, MOV max 50MB</div>
                </>
              )}
              <input type="file" accept="image/*, video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
            </label>
          </div>
        )}

        {/* Note */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '8px' }}>
            NOTE (optional)
          </label>
          {/* FIXED: Added a self-closing slash at the end of the textarea */}
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Any context for reviewers weight used, conditions, equipment..."
            rows={3}
            style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-deep)', border: '1px solid var(--border-dim)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-body)', resize: 'vertical' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-purple)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', marginBottom: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '13px', color: '#f87171' }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '14px', background: submitting ? 'rgba(239,68,68,0.4)' : '#ef4444', border: 'none', borderRadius: '12px', cursor: submitting ? 'not-allowed' : 'pointer', color: '#fff', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: submitting ? 'none' : '0 0 20px rgba(239,68,68,0.3)' }}>
          {submitting && <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />}
          {submitting ? 'SUBMITTING...' : 'SUBMIT FOR REVIEW →'}
        </button>

        {/* FIXED: Proper template literal syntax for style tag */}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}