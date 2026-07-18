/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Shield,
  Brain,
  LayoutDashboard,
  Users,
  Megaphone,
  Settings2,
  AlertTriangle,
  Radio,
  Lock,
  LogOut,
  Map,
  Terminal,
  Smartphone
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  adminEmail: string;
  onLogout: () => void;
  onTriggerAudit: () => void;
  broadcastsCount: number;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  adminEmail,
  onLogout,
  onTriggerAudit,
  broadcastsCount
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "notifications", label: "Notifications", icon: Megaphone, badge: broadcastsCount },
    { id: "app-config", label: "App Config", icon: Settings2 },
    { id: "device-logs", label: "Device Logs", icon: Smartphone },
    { id: "security", label: "Security & Policies", icon: AlertTriangle },
    { id: "live-map", label: "Live Map", icon: Map },
    { id: "test", label: "Test Trigger", icon: Radio },
    { id: "vault", label: "Secure Vault", icon: Lock },
    { id: "debug", label: "Debug Console", icon: Terminal }
  ];

  return (
    <aside className="w-[280px] bg-[#0c0b18] border-r border-[#1e1c31] flex flex-col justify-between shrink-0 h-screen overflow-y-auto">
      {/* Upper Container */}
      <div className="flex flex-col">
        {/* Logo and branding title */}
        <div className="px-6 py-6 border-b border-[#1e1c31] flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6122e6] rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(97,34,230,0.3)]">
            <Shield className="text-white w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="font-sans font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              Stitch <span className="text-[10px] bg-[#00f59b]/10 text-[#00f59b] border border-[#00f59b]/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Admin</span>
            </h1>
            <p className="font-sans text-[11px] text-[#8e8a9f]">
              Guardian Portal
            </p>
          </div>
        </div>

        {/* Gemini Security Audit Button */}
        <div className="px-4 py-5 select-none">
          <button
            onClick={onTriggerAudit}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#131127] hover:bg-[#1a1835] border border-[#252243] rounded-xl cursor-pointer transition-all duration-200 group relative shadow-md"
          >
            <Brain className="text-[#6122e6] w-5.5 h-5.5 group-hover:scale-110 transition-transform duration-300 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-sans font-semibold text-xs text-white">
                AI Threats Audit
              </span>
              <span className="font-sans text-[10px] text-[#8e8a9f] group-hover:text-white transition-colors">
                Run Gemini Assistant
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 px-3">
          {menuItems.map((item) => {
            const isActive = currentTab === item.id;
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl group transition-all duration-200 cursor-pointer text-left ${
                  isActive
                    ? "bg-[#1d1a36] text-[#00f59b] border border-[#2d2854]"
                    : "text-[#8e8a9f] hover:bg-[#131127] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent
                    className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? "text-[#00f59b]" : "text-[#8e8a9f]/70 group-hover:text-white"
                    }`}
                  />
                  <span className="font-sans text-sm font-medium">
                    {item.label}
                  </span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="font-mono text-[10px] bg-[#252243] text-white px-2 py-0.5 rounded-full border border-transparent group-hover:border-[#00f59b]/35 group-hover:text-[#00f59b] transition-all">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Down Side Container (Session & Details) */}
      <div className="border-t border-[#1e1c31] p-4 flex flex-col gap-3">
        {/* Administrator profile details card */}
        <div className="p-3 bg-[#131127] rounded-xl border border-[#252243] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6122e6]/20 border border-[#6122e6]/30 flex items-center justify-center text-[#ffea2a] font-mono text-sm font-semibold select-none overflow-hidden shrink-0 shadow-inner">
            Ab
          </div>
          <div className="flex flex-col min-w-0 text-left">
            <span className="font-sans font-semibold text-xs text-white truncate">
              Abir Specialist
            </span>
            <span className="font-mono text-[9px] text-[#8e8a9f] truncate">
              {adminEmail}
            </span>
          </div>
        </div>

        {/* Logout trigger button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-[#fc2e5c]/20 bg-[#fc2e5c]/5 hover:bg-[#fc2e5c]/15 text-[#ff8ba4] rounded-xl cursor-pointer transition-all duration-150 font-sans text-xs font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Logout Session
        </button>
      </div>
    </aside>
  );
}
