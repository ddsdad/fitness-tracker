import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      const { fallbackLabel = 'This section' } = this.props
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 200, padding: 32, textAlign: 'center', gap: 12,
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{fallbackLabel} crashed</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text3)', maxWidth: 260 }}>
            {this.state.error.message}
          </div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 8 }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
