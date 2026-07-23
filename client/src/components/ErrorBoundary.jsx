import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-950 border border-rose-800 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-100">Algo salió mal en esta sección</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Ocurrió un error inesperado al renderizar esta vista. Los datos existentes siguen a salvo en la memoria local.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left overflow-x-auto max-h-24 font-mono text-[10px] text-rose-400">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-grow flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-slate-700 hover:bg-slate-650 transition-colors text-xs font-semibold text-slate-100 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-grow flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-indigo-650 hover:bg-indigo-600 transition-colors text-xs font-semibold text-white cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
