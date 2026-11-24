import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class StartupErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('VINCORA render failure:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box', background: '#090d18', color: '#eef1ff', fontFamily: 'system-ui,sans-serif' }}>
          <div style={{ width: 'min(440px,100%)', padding: 28, border: '1px solid #293653', borderRadius: 18, background: '#111a2b', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 18 }}>VINCORA<span style={{ color: '#91aaff' }}> AI</span></div>
            <h2 style={{ fontSize: 17 }}>VINCORA could not render</h2>
            <p style={{ color: '#aab5ce', fontSize: 13, lineHeight: 1.6 }}>A React error stopped the workspace from rendering. Share this diagnostic to identify the exact fix.</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 12, borderRadius: 9, background: '#351c29', color: '#ffb9c5', font: '12px/1.5 ui-monospace,monospace' }}>{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  window.__vincoraShowBootError?.('Missing #root mount element');
} else {
  try {
    createRoot(rootElement).render(
      <React.StrictMode>
        <StartupErrorBoundary>
          <App />
        </StartupErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    window.__vincoraShowBootError?.(error?.stack || error?.message || error);
  }
}