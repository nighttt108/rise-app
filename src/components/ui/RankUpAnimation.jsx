import { useEffect, useState } from 'react'
import { RANK_COLORS, RANK_NAMES } from '../../lib/xp'

const RANK_TITLES = {
  D: 'APPRENTICE HUNTER',
  C: 'SKILLED OPERATIVE',
  B: 'EXPERT SHADOW',
  A: 'ELITE VANGUARD',
  S: 'SHADOW MONARCH',
  SS: 'THE ABSOLUTE',
}

const RANK_MESSAGES = {
  D: 'Your foundation is set. The real work begins now.',
  C: 'Others are starting to notice. Keep pushing.',
  B: 'You are in the top tier. Few reach this level.',
  A: 'Elite. You have outworked nearly everyone.',
  S: 'You stand among the chosen few. Legendary.',
  SS: 'There is no one above you. You are the Absolute.',
}

export function RankUpAnimation({ fromRank, toRank, genreName, onClose }) {
  const [phase, setPhase] = useState(0)
  const color = RANK_COLORS[toRank]
  const oldColor = RANK_COLORS[fromRank]

  useEffect(() => {
    const timings = [300, 900, 1400, 2000, 2800, 3800]
    const timers = timings.map((t, i) => setTimeout(() => setPhase(i + 1), t))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#000', overflow: 'hidden',
    }}>
      {phase >= 3 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center, ${color}20 0%, transparent 70%)`,
          animation: 'glowPulse 2s ease-in-out infinite',
        }} />
      )}
      {phase === 2 && (
        <div style={{
          position: 'absolute', inset: 0, background: '#fff',
          animation: 'flashOut 0.5s ease-out forwards',
        }} />
      )}
      {phase >= 3 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
        }} />
      )}

      <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px' }}>
        {phase === 1 && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.4em', marginBottom: '32px', animation: 'fadeUp 0.4s ease forwards' }}>RANK UP</div>
            <div style={{ width: '100px', height: '100px', borderRadius: '20px', border: `3px solid ${oldColor}`, background: `${oldColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 700, color: oldColor, margin: '0 auto', animation: 'fadeUp 0.4s ease forwards', boxShadow: `0 0 40px ${oldColor}40` }}>{fromRank}</div>
          </>
        )}

        {phase >= 3 && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.4em', marginBottom: '24px', opacity: phase >= 4 ? 1 : 0, transition: 'opacity 0.4s' }}>RANK UP</div>

            <div style={{ width: '120px', height: '120px', borderRadius: '24px', border: `3px solid ${color}`, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: 700, color, margin: '0 auto 24px', boxShadow: `0 0 60px ${color}50, 0 0 120px ${color}20`, animation: 'rankReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>{toRank}</div>

            {phase >= 4 && <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: `${color}99`, letterSpacing: '0.3em', marginBottom: '8px', animation: 'fadeUp 0.4s ease forwards' }}>{genreName?.toUpperCase()}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: '#fff', letterSpacing: '0.05em', marginBottom: '8px', animation: 'fadeUp 0.4s ease 0.1s both' }}>{RANK_TITLES[toRank] || `RANK ${toRank}`}</div>
              <div style={{ width: '60px', height: '2px', margin: '16px auto 24px', background: `linear-gradient(90deg, transparent, ${color}, transparent)`, animation: 'expandLine 0.6s ease 0.2s both' }} />
            </>}

            {phase >= 5 && <>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: 1.7, margin: '0 auto 32px', animation: 'fadeUp 0.4s ease forwards' }}>{RANK_MESSAGES[toRank]}</div>
              <button onClick={onClose} style={{ padding: '13px 48px', background: color, border: 'none', borderRadius: '12px', cursor: 'pointer', color: '#fff', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.12em', boxShadow: `0 0 30px ${color}50`, animation: 'fadeUp 0.4s ease 0.1s both' }}>
                CONTINUE →
              </button>
            </>}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes rankReveal { 0% { opacity:0; transform:scale(0.3) rotate(-10deg); } 60% { transform:scale(1.12) rotate(2deg); } 100% { opacity:1; transform:scale(1) rotate(0deg); } }
        @keyframes flashOut { 0% { opacity:1; } 100% { opacity:0; } }
        @keyframes glowPulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        @keyframes expandLine { from { width:0; opacity:0; } to { width:60px; opacity:1; } }
      `}</style>
    </div>
  )
}