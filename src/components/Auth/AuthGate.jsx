import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function AuthGate({ onSkip }) {
  const [mode, setMode]       = useState('signin') // 'signin' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else setSuccess('Check your email for a confirmation link, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        // success → StoreProvider's onAuthStateChange fires and loads data
      }
    } catch (err) {
      setError('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '32px 24px', gap: 0,
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏋️</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>FitTrack</h1>
        <p style={{ color: 'var(--text2)', marginTop: 8, fontSize: '0.9375rem', lineHeight: 1.5 }}>
          {mode === 'signin'
            ? 'Sign in to sync your data across all your devices.'
            : 'Create a free account to get started.'}
        </p>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error   && <p style={{ color: 'var(--red)',   fontSize: '0.875rem', margin: 0 }}>{error}</p>}
          {success && <p style={{ color: 'var(--green)', fontSize: '0.875rem', margin: 0 }}>{success}</p>}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          className="btn btn-ghost btn-full"
          style={{ marginTop: 12, fontSize: '0.875rem' }}
          onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <button className="btn btn-secondary btn-full" onClick={onSkip}>
        Continue without account
      </button>
      <p style={{ color: 'var(--text3)', fontSize: '0.75rem', marginTop: 10, textAlign: 'center' }}>
        Your data stays on this device only — you can sign up later.
      </p>
    </div>
  )
}
