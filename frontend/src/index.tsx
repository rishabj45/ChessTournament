import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chess Tournament App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              The chess tournament application encountered an unexpected error.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Reload Application
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Get the root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Create root and render the application
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Performance monitoring (optional)
if (process.env.NODE_ENV === 'development') {
  // Log render performance in development
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'measure') {
        console.log(`${entry.name}: ${entry.duration}ms`);
      }
    });
  });
  
  observer.observe({ entryTypes: ['measure'] });
}

// Service worker registration (for PWA features in production)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // In development, show more detailed error information
  if (process.env.NODE_ENV === 'development') {
    console.error('Promise rejection details:', event);
  }
  
  // Prevent the default browser behavior
  event.preventDefault();
});

// Global error handler for JavaScript errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // In development, show more detailed error information
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', event);
  }
});

// Expose useful development tools in development mode
if (process.env.NODE_ENV === 'development') {
  // Make React DevTools available
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
  
  // Development utilities
  (window as any).chessApp = {
    version: '1.0.0',
    mode: 'development',
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('Storage cleared');
    },
    getAppState: () => {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
        url: window.location.href,
        userAgent: navigator.userAgent
      };
    }
  };
  
  console.log('Chess Tournament App loaded in development mode');
  console.log('Available dev tools: window.chessApp');
}

export default App;