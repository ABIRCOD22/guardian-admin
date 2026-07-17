import { useState, useRef, useEffect } from "react";
import { Terminal, Trash2, Download } from "lucide-react";

interface LogEntry {
  level: string;
  module: string;
  message: string;
  timestamp: string;
}

export default function DebugLogView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const MAX_LOGS = 200;

  useEffect(() => {
    const originalConsole = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    const capture = (level: string, ...args: any[]) => {
      const msg = args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ");
      setLogs(prev => {
        const next = [...prev, { level, module: "CONSOLE", message: msg, timestamp: new Date().toISOString() }];
        return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
      });
    };

    console.debug = (...args) => { capture("DEBUG", ...args); originalConsole.debug(...args); };
    console.info = (...args) => { capture("INFO", ...args); originalConsole.info(...args); };
    console.warn = (...args) => { capture("WARN", ...args); originalConsole.warn(...args); };
    console.error = (...args) => { capture("ERROR", ...args); originalConsole.error(...args); };

    return () => {
      console.debug = originalConsole.debug;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filtered = filter === "ALL" ? logs : logs.filter(l => l.level === filter);

  const clearLogs = () => setLogs([]);
  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `guardian-debug-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const colorMap: Record<string, string> = {
    ERROR: "text-[#ff1744]",
    WARN: "text-[#ffea2a]",
    INFO: "text-[#00f59b]",
    DEBUG: "text-[#8e8a9f]",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-[#00f59b]" />
          Debug Console
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-[#131127] border border-[#252243] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6122e6]"
          >
            <option value="ALL">ALL</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
            <option value="DEBUG">DEBUG</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[#8e8a9f] cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="accent-[#6122e6]" />
            Auto-scroll
          </label>
          <button onClick={exportLogs} className="p-1.5 hover:bg-[#131127] rounded-lg transition-all" title="Export">
            <Download className="w-4 h-4 text-[#8e8a9f]" />
          </button>
          <button onClick={clearLogs} className="p-1.5 hover:bg-[#131127] rounded-lg transition-all" title="Clear">
            <Trash2 className="w-4 h-4 text-[#ff1744]" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 bg-[#0a0915] border border-[#1e1c31] rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-0.5 min-h-0">
        {filtered.length === 0 && (
          <p className="text-[#8e8a9f] text-center py-8">No logs captured yet.</p>
        )}
        {filtered.map((log, i) => (
          <div key={i} className="flex gap-2 hover:bg-[#131127]/50 px-1 py-0.5 rounded">
            <span className="text-[#4a4766] shrink-0 w-20">{log.timestamp.split("T")[1]?.split(".")[0]}</span>
            <span className={`shrink-0 w-12 font-bold ${colorMap[log.level] || "text-white"}`}>{log.level}</span>
            <span className="text-[#6122e6] shrink-0">[{log.module}]</span>
            <span className="text-white break-all">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
