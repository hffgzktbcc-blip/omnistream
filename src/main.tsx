import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Detect Capacitor native platform or local WebView asset runtime
const isNativeApp =
  typeof window !== 'undefined' &&
  (!!(window as any).Capacitor ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && !window.location.port) ||
    window.location.protocol === 'file:');

const REMOTE_API_ORIGIN = 'https://omnistream-mivy.onrender.com';

if (isNativeApp && typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(REMOTE_API_ORIGIN + input, init);
    }
    if (input instanceof Request && input.url.startsWith('/api')) {
      return originalFetch(new Request(REMOTE_API_ORIGIN + input.url, input));
    }
    return originalFetch(input, init);
  };
  console.log('[OmniStream Native] Fast local asset mode activated. Routing /api to', REMOTE_API_ORIGIN);
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('CRITICAL CLIENT ERROR:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#0B0F17', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>Application Render Error</h1>
          <p style={{ color: '#94a3b8', margin: '16px 0' }}>An error occurred while mounting the component tree:</p>
          <pre style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', color: '#fca5a5', overflowX: 'auto', fontSize: '13px', lineHeight: '1.5' }}>
            {this.state.error?.toString() || 'Unknown Error'}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
