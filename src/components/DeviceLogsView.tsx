import { useState, useEffect, useRef } from "react";
import type { DeviceLogEntry } from "../types.js";
import { logger } from "../utils/logger.js";
import { AlertCircle, AlertTriangle, Info, Bug, Terminal, Search, RefreshCw, Filter } from "lucide-react";

const LEVEL_COLORS: Record<string, string> = {
  VERBOSE: "text-gray-500",
  DEBUG: "text-cyan-400",
  INFO: "text-[#00f59b]",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
  ASSERT: "text-red-600",
};

const LEVEL_ICONS: Record<string, typeof AlertCircle> = {
  VERBOSE: Bug,
  DEBUG: Bug,
  INFO: Info,
  WARN: AlertTriangle,
  ERROR: AlertCircle,
  ASSERT: AlertCircle,
};

export default function DeviceLogsView() {
  const [logs, setLogs] = useState<DeviceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [deviceFilter, setDeviceFilter] = useState<string>("ALL");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      logger.error("DeviceLogsView", "fetch error", err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const devices = [...new Set(logs.map((l) => l.deviceName).filter(Boolean))];

  const filtered = logs.filter((l) => {
    if (levelFilter !== "ALL" && l.level !== levelFilter) return false;
    if (deviceFilter !== "ALL" && l.deviceName !== deviceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.message.toLowerCase().includes(q) &&
        !l.tag.toLowerCase().includes(q) &&
        !l.deviceName.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#6122e6] border-r-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-white">Device Logs</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#131127] border border-[#252243] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#6122e6] w-48"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-[#131127] border border-[#252243] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-[#6122e6]"
          >
            <option value="ALL">All Levels</option>
            <option value="VERBOSE">VERBOSE</option>
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="ASSERT">ASSERT</option>
          </select>
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="bg-[#131127] border border-[#252243] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-[#6122e6]"
          >
            <option value="ALL">All Devices</option>
            {devices.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${autoRefresh ? "bg-[#00f59b]/20 text-[#00f59b] border border-[#00f59b]/30" : "bg-[#131127] text-gray-500 border border-[#252243]"}`}
          >
            Auto
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131127] border border-[#252243] text-white text-xs font-bold hover:bg-[#1e1c31] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 rounded-lg">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-12 text-sm">No logs match your filters.</div>
        ) : (
          filtered.map((log) => {
            const Icon = LEVEL_ICONS[log.level] || Info;
            const date = new Date(log.timestamp).toLocaleString();
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 px-4 py-2 bg-[#0c0b18] border border-[#1e1c31] rounded-lg hover:border-[#252243] transition-all font-mono text-xs"
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${LEVEL_COLORS[log.level] || "text-gray-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold ${LEVEL_COLORS[log.level] || "text-gray-400"}`}>
                      {log.level}
                    </span>
                    <span className="text-[#6122e6]">[{log.tag}]</span>
                    {log.deviceName && (
                      <span className="text-[#00f59b]">{log.deviceName}</span>
                    )}
                    <span className="text-gray-600">{date}</span>
                  </div>
                  <div className="text-gray-300 mt-0.5 break-words whitespace-pre-wrap">{log.message}</div>
                  {log.stacktrace && (
                    <details className="mt-1">
                      <summary className="text-gray-600 cursor-pointer hover:text-gray-400 text-[10px]">Stack trace</summary>
                      <pre className="text-red-400/70 text-[10px] mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">{log.stacktrace}</pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="text-gray-600 text-[10px] font-mono">
        {filtered.length} / {logs.length} logs
      </div>
    </div>
  );
}
