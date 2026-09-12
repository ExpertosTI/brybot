import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#111827] border border-rose-500/40 rounded-2xl p-8 my-4 text-center max-w-xl mx-auto space-y-4 shadow-2xl">
          <div className="text-4xl">⚠️</div>
          <h3 className="text-lg font-bold text-white">
            {this.props.fallbackTitle || 'Hubo un detalle al cargar esta vista'}
          </h3>
          <p className="text-xs text-gray-400">
            {this.state.error?.message || 'Error inesperado de renderizado.'}
          </p>
          <div className="pt-2">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
            >
              🔄 Recargar Módulo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
