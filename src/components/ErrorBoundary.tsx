import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#06050e] flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-[#0c0b18] border border-[#1e1c31] rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-[#ff1744] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-[#8e8a9f] mb-4">An unexpected error occurred</p>
            <pre className="text-xs text-left bg-[#131127] border border-[#252243] rounded-lg p-4 mb-6 overflow-auto max-h-48 text-[#ff8ba4]">
              {this.state.error?.message}
              {"\n"}
              {this.state.error?.stack}
            </pre>
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6122e6] hover:bg-[#7c3aed] rounded-xl text-sm font-semibold text-white transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" />
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
