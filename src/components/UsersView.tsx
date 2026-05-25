/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { SecurityUser } from "../types";
import { Search, Download, Info, X } from "lucide-react";

import { Trash2, VolumeX } from "lucide-react";

interface UsersViewProps {
  users: SecurityUser[];
  onToggleProtection: (id: string) => void;
  onToggleStatus: (id: string, status: 'Active' | 'Inactive' | 'Blocked') => void;
  onDeleteUser: (id: string) => void;
  onStopAlarm: (id: string) => void;
}

export default function UsersView({
  users,
  onToggleProtection,
  onToggleStatus,
  onDeleteUser,
  onStopAlarm
}: UsersViewProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Inactive' | 'Blocked'>('All');
  const [selectedUser, setSelectedUser] = useState<SecurityUser | null>(null);

  // Compute stats
  const totalCount = users.length;
  const activeCount = users.filter(u => u.status === 'Active').length;
  const inactiveCount = users.filter(u => u.status === 'Inactive').length;
  const blockedCount = users.filter(u => u.status === 'Blocked').length;

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.deviceId.toLowerCase().includes(search.toLowerCase());

    if (activeTab === 'All') return matchesSearch;
    return matchesSearch && u.status === activeTab;
  });

  // Export mock CSV trigger
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Name,Email,Status,DeviceModel,OS,ProtectionActive,LastActive\n";
    users.forEach((item) => {
      csvContent += `"${item.id}","${item.name}","${item.email}","${item.status}","${item.deviceModel}","${item.osVersion}",${item.protectionActive},"${item.lastActive}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `guardian_fleet_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto animate-fade-in text-[#d9e3f5]">
      
      {/* Top action header card */}
      <section className="bg-[#141b25]/80 border border-[#2a3441] rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto relative text-left">
          <Search className="absolute left-3 text-[#b9cbb9]/50 w-5 h-5 shrink-0" />
          <input
            type="text"
            className="w-full md:w-80 bg-[#050f1b] border border-[#2a3441] rounded-lg pl-10 pr-4 py-2.5 outline-none font-sans text-sm focus:border-[#00ff88]/50 focus:ring-1 focus:ring-[#00ff88]/20 text-[#d9e3f5] transition-all"
            placeholder="Search matching users, devices, UUIDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Export Action */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#2a3441] text-[#b9cbb9] hover:text-[#00ff88] border border-[#3b4b3d]/40 hover:border-[#00ff88]/30 px-4 py-2.5 rounded-lg cursor-pointer transition-all font-sans text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </section>

      {/* Grid summarizing subcategories */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <button
          onClick={() => setActiveTab('All')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'All'
              ? "bg-[#212b38] border-[#00ff88]/50"
              : "bg-[#141b25]/60 border-[#2a3441] hover:border-[#2a3441]/80"
          }`}
        >
          <span className="font-sans text-[11px] text-[#b9cbb9]/50 block uppercase font-mono tracking-wider font-semibold">
            All Enrolled Slots
          </span>
          <span className="font-sans font-bold text-2xl text-[#d9e3f5] mt-1 block">
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('Active')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'Active'
              ? "bg-[#212b38] border-[#00ff88]/50"
              : "bg-[#141b25]/60 border-[#2a3441] hover:border-[#2a3441]/80"
          }`}
        >
          <span className="font-sans text-[11px] text-teal-400 block uppercase font-mono tracking-wider font-semibold">
            Active Devices
          </span>
          <span className="font-sans font-bold text-2xl text-teal-300 mt-1 block">
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('Inactive')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'Inactive'
              ? "bg-[#212b38] border-[#00ff88]/50"
              : "bg-[#141b25]/60 border-[#2a3441] hover:border-[#2a3441]/80"
          }`}
        >
          <span className="font-sans text-[11px] text-gray-400 block uppercase font-mono tracking-wider font-semibold">
            Inactive Enrolls
          </span>
          <span className="font-sans font-bold text-2xl text-gray-300 mt-1 block">
            {inactiveCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('Blocked')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'Blocked'
              ? "bg-[#212b38] border-[#ff5e62]/70"
              : "bg-[#141b25]/60 border-[#2a3441] hover:border-[#2a3441]/80"
          }`}
        >
          <span className="font-sans text-[11px] text-[#ffb4ab] block uppercase font-mono tracking-wider font-semibold">
            Access Blocked
          </span>
          <span className="font-sans font-bold text-2xl text-[#ffb4ab] mt-1 block">
            {blockedCount}
          </span>
        </button>

      </section>

      {/* Fleet table container */}
      <section className="bg-[#141b25]/80 border border-[#2a3441] rounded-xl p-6 text-left">
        <h3 className="font-sans font-bold text-sm text-[#d9e3f5] mb-5">
          Directory Subscribers list
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-[#2a3441] text-[#b9cbb9]/60 font-mono text-[10px] uppercase">
                <th className="py-3 font-semibold pl-4">Enrolled User</th>
                <th className="py-3 font-semibold">Device Parameters</th>
                <th className="py-3 font-semibold">Revocation state</th>
                <th className="py-3 font-semibold">Encryption Guard</th>
                <th className="py-3 font-semibold">Synchronization</th>
                <th className="py-3 font-semibold text-right pr-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3441]/30">
              {filteredUsers.map((user) => {
                const isActive = user.status === "Active";
                const isBlocked = user.status === "Blocked";

                return (
                  <tr key={user.id} className="hover:bg-[#1a232f]/40 transition-colors group">
                    {/* User profile entry */}
                    <td className="py-4 pl-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2a3441] border border-[#3b4b3d]/50 flex items-center justify-center font-mono text-xs font-bold text-[#b9cbb9] overflow-hidden select-none">
                        {user.initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sans font-semibold text-sm text-[#d9e3f5] group-hover:text-white transition-colors">
                          {user.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#b9cbb9]/50">
                          {user.email}
                        </span>
                      </div>
                    </td>

                    {/* Device Parameters */}
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="font-sans font-medium text-[#d9e3f5]">
                          {user.deviceModel}
                        </span>
                        <span className="font-mono text-[9.5px] text-[#b9cbb9]/50">
                          {user.osVersion}
                        </span>
                      </div>
                    </td>

                    {/* Revocation State Badges */}
                    <td className="py-4">
                      {isActive ? (
                        <span className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono text-[9px] rounded font-bold uppercase">
                          Active
                        </span>
                      ) : isBlocked ? (
                        <span className="px-2.5 py-1 bg-[#93000a]/15 border border-[#93000a]/50 text-[#ffb4ab] font-mono text-[9px] rounded font-bold uppercase animate-pulse">
                          Access Blocked
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-500/15 border border-gray-600/30 text-gray-400 font-mono text-[9px] rounded font-bold uppercase">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Encryption Guard Toggle */}
                    <td className="py-4">
                      <div className="flex items-center gap-3 select-none">
                        <button
                          onClick={() => onToggleProtection(user.id)}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            user.protectionActive ? "bg-[#00ff88]" : "bg-[#2a3441]"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#050f1b] shadow ring-0 transition duration-200 ease-in-out ${
                              user.protectionActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className={`font-mono text-[10px] font-semibold ${
                          user.protectionActive ? "text-[#00ff88]" : "text-[#b9cbb9]/40"
                        }`}>
                          {user.protectionActive ? "ON" : "OFF"}
                        </span>
                      </div>
                    </td>

                    {/* Synchronization Log */}
                    <td className="py-4 font-mono text-[10px] text-[#b9cbb9]/60">
                      {user.lastSync}
                    </td>

                    {/* Actions */}
                    <td className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onStopAlarm(user.id)}
                          className="text-[#b9cbb9]/30 hover:text-[#ffea2a] transition-all p-1 flex hover:bg-[#ffea2a]/10 rounded cursor-pointer justify-center items-center w-8 h-8"
                          title="Stop alarm remotely"
                        >
                          <VolumeX className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm("Permanently delete this user?")) onDeleteUser(user.id); }}
                          className="text-[#b9cbb9]/30 hover:text-[#ff5e62] transition-all p-1 flex hover:bg-[#93000a]/20 rounded cursor-pointer justify-center items-center w-8 h-8"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-[#b9cbb9]/50 hover:text-[#00ff88] transition-all p-1 flex hover:bg-[#2a3441]/50 rounded cursor-pointer justify-center items-center w-8 h-8"
                        >
                          <Info className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail drawer modal window */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050f1b]/80 backdrop-blur-sm pointer-events-auto p-4 select-none">
          <div className="bg-[#141b25] border border-[#2a3441] rounded-xl w-full max-w-xl p-6 shadow-2xl relative animate-scale-up text-left">
            
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-[#2a3441] pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00ff88]/15 border border-[#3b4b3d] flex items-center justify-center text-[#ffea2a] font-mono text-sm font-semibold select-none shrink-0 uppercase">
                  {selectedUser.initials}
                </div>
                <div className="flex flex-col">
                  <h4 className="font-sans font-bold text-base text-[#d9e3f5]">
                    {selectedUser.name}
                  </h4>
                  <span className="font-mono text-[11px] text-[#b9cbb9]/50">
                    ID: {selectedUser.deviceId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[#b9cbb9]/55 hover:text-white transition-colors border border-[#2a3441] hover:bg-[#2a3441] w-8 h-8 rounded-lg cursor-pointer flex justify-center items-center"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal contents */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0a1420]/50 p-3 rounded-lg border border-[#232d3a]/60">
                <span className="font-mono text-[10px] text-[#b9cbb9]/40 block uppercase">Email Directory</span>
                <span className="font-sans text-[#d9e3f5] font-semibold block mt-0.5">{selectedUser.email}</span>
              </div>
              <div className="bg-[#0a1420]/50 p-3 rounded-lg border border-[#232d3a]/60">
                <span className="font-mono text-[10px] text-[#b9cbb9]/40 block uppercase">Subscribed Hardware</span>
                <span className="font-sans text-[#d9e3f5] font-semibold block mt-0.5">{selectedUser.deviceModel}</span>
              </div>
              <div className="bg-[#0a1420]/50 p-3 rounded-lg border border-[#232d3a]/60 col-span-2">
                <span className="font-mono text-[10px] text-[#b9cbb9]/40 block uppercase">Authenticated OS Kernel</span>
                <span className="font-mono text-[#00ff88] font-semibold block mt-0.5">{selectedUser.osVersion}</span>
              </div>
              <div className="bg-[#0a1420]/50 p-3 rounded-lg border border-[#232d3a]/60">
                <span className="font-mono text-[10px] text-[#b9cbb9]/40 block uppercase">Physical Telemetry Heartbeat</span>
                <span className="font-sans text-[#d9e3f5] mt-0.5 block font-semibold">{selectedUser.lastActive}</span>
              </div>
              <div className="bg-[#0a1420]/50 p-3 rounded-lg border border-[#232d3a]/60">
                <span className="font-mono text-[10px] text-[#b9cbb9]/40 block uppercase">MFA Lock-out Protection</span>
                <span className="font-mono text-[#d9e3f5] mt-0.5 block font-semibold">
                  {selectedUser.protectionActive ? "STRICT SECURED" : "BYPASSED / WARNING"}
                </span>
              </div>
            </div>

            {/* Danger administrative commands row */}
            <div className="mt-6 pt-5 border-t border-[#2a3441] flex flex-col gap-3">
              <span className="font-mono text-[10px] text-[#ffb4ab] font-bold block uppercase tracking-wider">
                Revocation & Diagnostics Panel
              </span>
              <div className="flex flex-wrap gap-2.5">
                
                {/* Block / Unblock command */}
                {selectedUser.status === "Blocked" ? (
                  <button
                    onClick={() => {
                      onToggleStatus(selectedUser.id, "Active");
                      setSelectedUser({ ...selectedUser, status: "Active" });
                    }}
                    className="flex-1 bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 text-teal-300 font-sans py-2.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Authorize Active Session
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onToggleStatus(selectedUser.id, "Blocked");
                      setSelectedUser({ ...selectedUser, status: "Blocked" });
                    }}
                    className="flex-1 bg-[#93000a]/10 border border-[#93000a]/50 hover:bg-[#93000a]/20 text-[#ffb4ab] font-sans py-2.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Kill Device Connection
                  </button>
                )}

                {/* Force sync */}
                <button
                  onClick={() => {
                    alert(`Dispatched sync request to target device UID "${selectedUser.deviceId}". Waiting on heartbeats...`);
                    setSelectedUser(null);
                  }}
                  className="bg-[#2a3441] hover:bg-[#354354] border border-[#3b4b3d]/40 text-[#d9e3f5] font-sans py-2.5 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Remote Key Sync
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
