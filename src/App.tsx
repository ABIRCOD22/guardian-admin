/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  AdminAccount,
  BroadcastNotification,
  EventLog,
  SecurityConfig,
  SecurityUser,
  LiveFeedItem,
  EventLogStatus
} from "./types.js";

import Sidebar from "./components/Sidebar.js";
import DashboardView from "./components/DashboardView.js";
import UsersView from "./components/UsersView.js";
import NotificationsView from "./components/NotificationsView.js";
import AppConfigView from "./components/AppConfigView.js";
import SettingsView from "./components/SettingsView.js";
import SecurityAuditsView from "./components/SecurityAuditsView.js";
import TestView from "./components/TestView.js";
import VaultView from "./components/VaultView.js";
import LoginView from "./components/LoginView.js";
import AlarmPanel from "./components/AlarmPanel.js";
import LiveMapView from "./components/LiveMapView.js";
import ErrorBoundary from "./components/ErrorBoundary.js";
import DebugLogView from "./components/DebugLogView.js";
import DeviceLogsView from "./components/DeviceLogsView.js";
import { logger } from "./utils/logger.js";

import { Shield, Sparkles, AlertCircle, AlertTriangle } from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [currentTab, setCurrentTab] = useState("dashboard");

  // State caches pulling from full-stack backend APIs representatively
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [feed, setFeed] = useState<LiveFeedItem[]>([]);

  // Telemetry details ticking
  const [apiRequests, setApiRequests] = useState(1204002);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dangerUsers, setDangerUsers] = useState<SecurityUser[]>([]);
  const [alarmDetailUser, setAlarmDetailUser] = useState<SecurityUser | null>(null);

  // Expanded detailed inspection sidebar details
  const [inspectedLog, setInspectedLog] = useState<EventLog | null>(null);

  // Initial data loading from server on boot
  const fetchState = async () => {
    try {
      const response = await fetch("/api/state");
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins);
        setBroadcasts(data.broadcasts);
        setLogs(data.logs);
        setConfig(data.config);
        setUsers(data.users);
        setFeed(data.feed);
        logger.info("App", "fetchState — state loaded", {
          adminCount: data.admins?.length,
          userCount: data.users?.length,
          broadcastCount: data.broadcasts?.length,
          logCount: data.logs?.length
        });
      }
    } catch (err) {
      logger.error("App", "fetchState — failed to load state", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    logger.info("App", "App mounted, fetching initial state");
    let pollCount = 0;
    fetchState();

    // Poll every 30s (Firebase Spark: 50K reads/day max)
    const pollTimer = setInterval(() => {
      pollCount++;
      fetchState();
    }, 30000);

    // Interval ticking system to make dashboard stats feel completely live and interconnected
    const counterTimer = setInterval(() => {
      setApiRequests((prev) => prev + Math.floor(Math.random() * 5) + 1);
    }, 4500);

    return () => {
      clearInterval(pollTimer);
      clearInterval(counterTimer);
    };
  }, []);

  // Detect users with active alarms
  useEffect(() => {
    setDangerUsers(users.filter(u => u.alarmActive));
  }, [users]);

  // Post wrappers matching backend architecture
  const handleToggleProtection = async (id: string) => {
    try {
      const response = await fetch("/api/users/toggle-protection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        logger.info("App", "handleToggleProtection — success", { id });
        fetchState();
      } else {
        const data = await response.json().catch(() => ({}));
        logger.warn("App", "handleToggleProtection — request not ok", { id, error: data.error });
        alert(data.error || "Failed to toggle protection — device may be unavailable.");
      }
    } catch (err) {
      logger.error("App", "handleToggleProtection — error", { id }, err as Error);
    }
  };

  const handleToggleStatus = async (id: string, status: 'Active' | 'Inactive' | 'Blocked') => {
    try {
      const response = await fetch("/api/users/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (response.ok) {
        logger.info("App", "handleToggleStatus — success", { id, status });
        fetchState();
      } else {
        const data = await response.json().catch(() => ({}));
        logger.warn("App", "handleToggleStatus — request not ok", { id, status, error: data.error });
        alert(data.error || "Failed to update status — device may be unavailable.");
      }
    } catch (err) {
      logger.error("App", "handleToggleStatus — error", { id, status }, err as Error);
    }
  };

  const handleAddBroadcast = async (bcPayload: {
    title: string;
    body: string;
    targetAudience: string;
    actionUrl: string;
    scheduleForLater: boolean;
    schedule: string;
  }) => {
    try {
      const response = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bcPayload)
      });
      if (response.ok) {
        logger.info("App", "handleAddBroadcast — success", { title: bcPayload.title, audience: bcPayload.targetAudience });
        fetchState();
        alert("Emergency advisory dispatched successfully on targeted spectrum.");
      }
    } catch (err) {
      logger.error("App", "handleAddBroadcast — error", { title: bcPayload.title }, err as Error);
    }
  };

  const handleUpdateConfig = async (updates: Partial<SecurityConfig>) => {
    try {
      const response = await fetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        logger.info("App", "handleUpdateConfig — success", { updates });
        fetchState();
      }
    } catch (err) {
      logger.error("App", "handleUpdateConfig — error", { updates }, err as Error);
    }
  };

  const handleAddAdmin = async (newAdmin: { name: string; email: string; role: 'Super Admin' | 'Analyst' }) => {
    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin)
      });
      if (response.ok) {
        logger.info("App", "handleAddAdmin — success", { name: newAdmin.name, email: newAdmin.email, role: newAdmin.role });
        fetchState();
      }
    } catch (err) {
      logger.error("App", "handleAddAdmin — error", { name: newAdmin.name, email: newAdmin.email }, err as Error);
    }
  };

  // Inline checklist timeline updates
  const handleUpdateLogStatus = (id: string, status: EventLogStatus) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
  };

  const handleAddActionTrail = (id: string, text: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + " UTC";
    const newAction = {
      text,
      timestamp,
      icon: "check_circle",
      color: "primary"
    };

    setLogs((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, actionTrail: [...l.actionTrail, newAction] }
          : l
      )
    );
  };

  // Perform Gemini threat audit
  const handleRunAudit = async (promptText: string): Promise<string> => {
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText })
      });
      if (response.ok) {
        const data = await response.json();
        logger.info("App", "handleRunAudit — success", { promptLength: promptText.length });
        return data.report;
      }
      throw new Error();
    } catch (err) {
      logger.error("App", "handleRunAudit — error", { promptLength: promptText.length }, err as Error);
      return "# Audit Handshake Failed\nFailed to establish connection. Offline backup guidelines initialized.";
    }
  };

  const handleStopAlarm = async (id: string) => {
    try {
      const response = await fetch("/api/users/stop-alarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        logger.info("App", "handleStopAlarm — success", { id });
        alert("Stop signal sent to device.");
      } else {
        const data = await response.json().catch(() => ({}));
        logger.warn("App", "handleStopAlarm — request not ok", { id, error: data.error });
        alert(data.error || "Failed to stop alarm.");
      }
    } catch (err) {
      logger.error("App", "handleStopAlarm — error", { id }, err as Error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Permanently delete this user account? This cannot be undone.")) return;
    try {
      const response = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        logger.info("App", "handleDeleteUser — success", { id });
        fetchState();
      } else {
        const data = await response.json().catch(() => ({}));
        logger.warn("App", "handleDeleteUser — request not ok", { id, error: data.error });
        alert(data.error || "Failed to delete user.");
      }
    } catch (err) {
      logger.error("App", "handleDeleteUser — error", { id }, err as Error);
    }
  };

  // Quick navigation helpers
  const handleNavigateToTab = (tab: string) => {
    setCurrentTab(tab);
  };

  const handleOpenLogDetails = (log: EventLog) => {
    setInspectedLog(log);
    setCurrentTab("event-logs");
  };

  // If loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[#06050e] flex flex-col justify-center items-center select-none text-white">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#6122e6] border-r-transparent animate-spin" />
          <Shield className="text-[#00f59b] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 animate-pulse" />
        </div>
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#8e8a9f]">
          Loading Secure Space Node...
        </p>
      </div>
    );
  }

  // Auth gate
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={(email) => {
      setIsAuthenticated(true);
      setAdminEmail(email);
    }} />;
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen flex bg-[#06050e] text-white select-none h-full overflow-hidden w-full font-sans antialiased">
      
      {/* Visual background pattern with pristine dot grid matching stitch blueprint style */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundSize: "28px 28px",
          backgroundImage: `radial-gradient(#6122e6 1.5px, transparent 1.5px)`
        }}
      />

      {/* Left Sidebar navigation panel */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleNavigateToTab}
        adminEmail={adminEmail}
        onLogout={() => {
          setIsAuthenticated(false);
          setAdminEmail("");
        }}
        onTriggerAudit={() => setShowAuditDrawer(true)}
        broadcastsCount={broadcasts.length}
      />

      {/* Main View Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Danger Banner — active alarm notification */}
        {dangerUsers.length > 0 && (
          <div className="z-50 shrink-0 flex items-center justify-center gap-3 px-4 py-2 bg-[#93000a] border-b-2 border-[#ff5e62] text-white font-mono text-xs font-bold uppercase tracking-wider animate-pulse">
            <AlertTriangle className="w-4 h-4 text-[#ffea2a]" />
            <span>
              {dangerUsers.length === 1
                ? `${dangerUsers[0].name} device is in danger — alarm playing!`
                : `${dangerUsers.length} devices in danger — alarms active!`}
            </span>
            <button
              onClick={() => setAlarmDetailUser(dangerUsers[0])}
              className="ml-2 px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/30 rounded text-[10px] font-bold cursor-pointer transition-all"
            >
              View Details
            </button>
            <button
              onClick={() => setCurrentTab("users")}
              className="underline ml-1 cursor-pointer hover:text-[#ffea2a] transition-colors"
            >
              Go to Users
            </button>
          </div>
        )}

        {/* Responsive Layout Header */}
        <header className="h-[76px] bg-[#0c0b18] border-b border-[#1e1c31] flex items-center justify-between px-8 relative shrink-0">
          
          <div className="flex items-center gap-3">
            <h2 className="font-sans font-bold text-[16px] text-white tracking-tight">
              {currentTab === "dashboard" && "Network Overview Dashboard"}
              {currentTab === "users" && "User & Device Registry"}
              {currentTab === "notifications" && "Direct Dispatch Notifications"}
              {currentTab === "app-config" && "Hardware & Security Policies"}
              {currentTab === "live-map" && "Live Location & Emergency Map"}
              {currentTab === "device-logs" && "Device Remote Logs"}
              {currentTab === "test" && "Test Panic Trigger"}
              {currentTab === "vault" && "Secure Vault"}
              {currentTab === "debug" && "Debug Console & Logs"}
              {currentTab === "security" && "Zero-Trust Administration Area"}
            </h2>
            <div className="w-1.5 h-1.5 rounded-full bg-[#00f59b] animate-pulse" />
          </div>

          <div className="flex items-center gap-5 select-none">
            {/* Status indicator pill */}
            <div className="flex bg-[#131127] border border-[#252243] px-3.5 py-1.5 rounded-xl items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f59b] block animate-pulse" />
              <span className="font-sans text-[10px] text-[#8e8a9f] font-semibold uppercase tracking-wider">
                System Active
              </span>
            </div>
            
            {/* Interactive Quick-Audit Pill trigger */}
            <button
              onClick={() => setShowAuditDrawer(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#6122e6]/25 bg-[#6122e6]/5 hover:bg-[#6122e6]/10 text-[#a78bfa] font-sans text-xs font-semibold cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00f59b]" />
              <span>Prompt Auditor</span>
            </button>
          </div>
        </header>

        {/* Tab view portal mapping */}
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className={currentTab === "dashboard" ? "" : "hidden"}>
            <DashboardView
              users={users}
              logs={logs}
              feed={feed}
              apiCount={apiRequests}
              maintenanceMode={config?.maintenanceMode || false}
              onOpenLogDetails={handleOpenLogDetails}
              onNavigateToTab={handleNavigateToTab}
            />
          </div>

          <div className={currentTab === "users" ? "" : "hidden"}>
            <UsersView
              users={users}
              onToggleProtection={handleToggleProtection}
              onToggleStatus={handleToggleStatus}
              onDeleteUser={handleDeleteUser}
              onStopAlarm={handleStopAlarm}
            />
          </div>

          <div className={currentTab === "notifications" ? "" : "hidden"}>
            <NotificationsView
              broadcasts={broadcasts}
              onAddBroadcast={handleAddBroadcast}
            />
          </div>

          <div className={currentTab === "app-config" ? "" : "hidden"}>
            {config && (
              <AppConfigView
                config={config}
                onUpdateConfig={handleUpdateConfig}
              />
            )}
          </div>

          <div className={`h-full ${currentTab === "live-map" ? "" : "hidden"}`}>
            <LiveMapView
              users={users}
              onSendCommand={(userId, command) => {
                if (command === "disarm") handleToggleProtection(userId);
                if (command === "siren") handleStopAlarm(userId);
              }}
              onSendAlert={() => fetchState()}
            />
          </div>

          <div className={currentTab === "test" ? "" : "hidden"}>
            <TestView users={users} />
          </div>

          <div className={currentTab === "vault" ? "" : "hidden"}>
            <VaultView />
          </div>

          <div className={currentTab === "device-logs" ? "" : "hidden"}>
            <DeviceLogsView />
          </div>

          <div className={currentTab === "debug" ? "" : "hidden"}>
            <DebugLogView />
          </div>

          <div className={currentTab === "security" ? "" : "hidden"}>
            {config && (
              <SettingsView
                admins={admins}
                config={config}
                onAddAdmin={handleAddAdmin}
                onUpdateConfig={handleUpdateConfig}
              />
            )}
          </div>
        </main>
      </div>

      {/* Sliding AI security reports drawer overlay */}
      {showAuditDrawer && (
        <SecurityAuditsView
          onClose={() => setShowAuditDrawer(false)}
          onRunAudit={handleRunAudit}
        />
      )}

      {/* Alarm Detail Panel — full-screen overlay */}
      {alarmDetailUser && (
        <AlarmPanel
          user={alarmDetailUser}
          onStopAlarm={handleStopAlarm}
          onNavigateToUsers={() => {
            setAlarmDetailUser(null);
            setCurrentTab("users");
          }}
          onClose={() => setAlarmDetailUser(null)}
        />
      )}

    </div>
    </ErrorBoundary>
  );
}
