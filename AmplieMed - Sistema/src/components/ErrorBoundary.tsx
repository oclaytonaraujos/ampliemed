import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: `ERR_${crypto.randomUUID()}`,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, eventId: `ERR_${crypto.randomUUID()}` };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console for audit (no localStorage)
    console.error('[AmplieMed ErrorBoundary]', {
      id: this.state.eventId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white border border-red-200 max-w-lg w-full p-8 shadow-lg">
            {/* Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-gray-900 text-lg font-semibold">Algo deu errado</h2>
                <p className="text-red-600 text-sm">Erro de renderização detectado</p>
              </div>
            </div>

            {/* Error message */}
            <div className="bg-red-50 border border-red-200 p-4 mb-6">
              <p className="text-sm text-red-800 font-mono break-all">
                {this.state.error?.message || 'Erro desconhecido'}
              </p>
              <p className="text-xs text-red-500 mt-1">
                ID: {this.state.eventId}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Ir para o Dashboard
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar página
              </button>
            </div>

            {/* Stack trace (dev only) */}
            {import.meta.env.DEV && this.state.error?.stack && (
              <details className="mt-6">
                <summary className="text-xs text-gray-500 cursor-pointer flex items-center gap-1 hover:text-gray-700">
                  <Bug className="w-3 h-3" /> Detalhes técnicos (dev mode)
                </summary>
                <pre className="mt-2 text-xs text-gray-500 bg-gray-100 p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error.stack}
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

// ─── Lightweight inline error boundary for module-level wrapping ──────────────

interface ModuleErrorProps { moduleName: string; onReset: () => void; }

export function ModuleError({ moduleName, onReset }: ModuleErrorProps) {
  return (
    <div className="bg-red-50 border border-red-200 p-6 flex items-start gap-4">
      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">Erro no módulo: {moduleName}</p>
        <p className="text-xs text-red-600 mt-1">Ocorreu um erro ao renderizar este módulo.</p>
        <button
          onClick={onReset}
          className="mt-3 flex items-center gap-2 text-xs px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Tentar novamente
        </button>
      </div>
    </div>
  );
}