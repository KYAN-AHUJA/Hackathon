import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-white p-6 text-center">
          <div className="max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl">
            <h2 className="font-serif text-2xl mb-4">Something went wrong</h2>
            <p className="font-sans text-sm text-white/70 mb-6">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-full bg-white text-black font-sans text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Reload Experience
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
