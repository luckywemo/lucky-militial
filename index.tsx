import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("INDEX.TSX: STARTING BOOTSTRAP");

const ErrorFallback = ({ error }: { error: Error }) => (
  <div style={{ color: 'red', padding: '20px', background: 'white', zIndex: 10000, position: 'fixed', top: 0, left: 0 }}>
    <h1>Startup Crash Detected</h1>
    <pre>{error.message}</pre>
    <pre>{error.stack}</pre>
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', padding: '20px', fontFamily: 'monospace' }}>
          <h1>TERMINAL CRASH</h1>
          <pre>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()}>REBOOT SYSTEM</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

console.log("INDEX.TSX: ROOT FOUND, MOUNTING REACT");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
