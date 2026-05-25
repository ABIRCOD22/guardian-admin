import { useState } from "react";
import { SecurityUser } from "../types";
import { Radio, Smartphone, ShieldOff, Search } from "lucide-react";

interface TestViewProps {
  users: SecurityUser[];
}

export default function TestView({ users }: TestViewProps) {
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.deviceId.toLowerCase().includes(search.toLowerCase())
  );

  const handleTestTrigger = async (user: SecurityUser) => {
    setSendingId(user.id);
    setResult(null);
    try {
      const res = await fetch("/api/users/test-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id })
      });
      const data = await res.json();
      setResult({ id: user.id, ok: res.ok, msg: data.error || "Signal sent successfully" });
    } catch {
      setResult({ id: user.id, ok: false, msg: "Network error" });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto animate-fade-in text-[#d9e3f5]">
      <section className="bg-[#141b25]/80 border border-[#2a3441] rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto relative text-left">
          <Search className="absolute left-3 text-[#b9cbb9]/50 w-5 h-5 shrink-0" />
          <input
            type="text"
            className="w-full md:w-80 bg-[#050f1b] border border-[#2a3441] rounded-lg pl-10 pr-4 py-2.5 outline-none font-sans text-sm focus:border-[#00ff88]/50 text-[#d9e3f5]"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-[#b9cbb9]/60">
          <Radio className="w-4 h-4 text-[#ffea2a]" />
          Sends a simulated "Where are you" panic trigger to test device response
        </div>
      </section>

      <section className="bg-[#141b25]/80 border border-[#2a3441] rounded-xl p-6 text-left">
        <h3 className="font-sans font-bold text-sm text-[#d9e3f5] mb-5">
          Test Panic Trigger ({filtered.length} devices)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-[#2a3441] text-[#b9cbb9]/60 font-mono text-[10px] uppercase">
                <th className="py-3 font-semibold pl-4">User</th>
                <th className="py-3 font-semibold">Device</th>
                <th className="py-3 font-semibold">Status</th>
                <th className="py-3 font-semibold text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3441]/30">
              {filtered.map(user => {
                const isSending = sendingId === user.id;
                const lastResult = result?.id === user.id ? result : null;
                return (
                  <tr key={user.id} className="hover:bg-[#1a232f]/40 transition-colors group">
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2a3441] border border-[#3b4b3d]/50 flex items-center justify-center font-mono text-xs font-bold text-[#b9cbb9]">
                          {user.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-sans font-semibold text-sm text-[#d9e3f5]">{user.name}</span>
                          <span className="font-mono text-[10px] text-[#b9cbb9]/50">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="font-sans font-medium text-[#d9e3f5]">{user.deviceModel}</span>
                        <span className="font-mono text-[9.5px] text-[#b9cbb9]/50">{user.osVersion}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {user.protectionActive ? (
                          <Smartphone className="w-4 h-4 text-[#00ff88]" />
                        ) : (
                          <ShieldOff className="w-4 h-4 text-[#ffb4ab]" />
                        )}
                        <span className={`font-mono text-[10px] ${user.protectionActive ? "text-[#00ff88]" : "text-[#ffb4ab]"}`}>
                          {user.protectionActive ? "Protected" : "Unprotected"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        {lastResult && (
                          <span className={`text-[10px] ${lastResult.ok ? "text-[#00ff88]" : "text-[#ffb4ab]"}`}>
                            {lastResult.ok ? "✓ Sent" : lastResult.msg}
                          </span>
                        )}
                        <button
                          onClick={() => handleTestTrigger(user)}
                          disabled={isSending}
                          className="flex items-center gap-1.5 bg-[#2a3441] hover:bg-[#ffea2a]/20 hover:text-[#ffea2a] border border-[#3b4b3d]/40 disabled:opacity-40 text-[#b9cbb9] px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                        >
                          <Radio className={`w-3.5 h-3.5 ${isSending ? "animate-pulse" : ""}`} />
                          {isSending ? "Sending..." : "Test Trigger"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#b9cbb9]/40 text-sm">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
