/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SecurityConfig } from "../types";
import {
  ShieldAlert,
  Wrench,
  Layers,
  Database,
  RefreshCw
} from "lucide-react";

interface AppConfigViewProps {
  config: SecurityConfig;
  onUpdateConfig: (config: Partial<SecurityConfig>) => void;
}

export default function AppConfigView({
  config,
  onUpdateConfig
}: AppConfigViewProps) {
  const [require2FA, setRequire2FA] = useState(config.require2FA);
  const [sessionTimeout, setSessionTimeout] = useState(config.sessionTimeout);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(config.maxLoginAttempts);
  const [projectId, setProjectId] = useState(config.projectId);
  const [maintenanceMode, setMaintenanceMode] = useState(config.maintenanceMode);
  const [maintenanceSplashMessage, setMaintenanceSplashMessage] = useState(config.maintenanceSplashMessage);
  const [maintenanceStartTime, setMaintenanceStartTime] = useState(config.maintenanceStartTime);
  const [maintenanceEndTime, setMaintenanceEndTime] = useState(config.maintenanceEndTime);
  const [announcementEnabled, setAnnouncementEnabled] = useState(config.announcementEnabled);
  const [announcementTitle, setAnnouncementTitle] = useState(config.announcementTitle || "CRITICAL MEMORANDUM");
  const [announcementBody, setAnnouncementBody] = useState(config.announcementBody || "Biometric authentication systems are undergoing automated core certificate rotation audits.");
  const [announcementPriority, setAnnouncementPriority] = useState<'Info' | 'Warning' | 'Critical'>(config.announcementPriority);
  const [panicTriggerKeyword, setPanicTriggerKeyword] = useState(config.panicTriggerKeyword);
  const [maxPinAttempts, setMaxPinAttempts] = useState(config.maxPinAttempts);
  const [alarmAudioConfig, setAlarmAudioConfig] = useState(config.alarmAudioConfig);
  const [defaultVolumeOverride, setDefaultVolumeOverride] = useState(config.defaultVolumeOverride);
  const [forceUpdate, setForceUpdate] = useState(config.forceUpdate);
  const [minRequiredVersion, setMinRequiredVersion] = useState(config.minRequiredVersion);
  const [updateMessage, setUpdateMessage] = useState(config.updateMessage);
  const [updateUrl, setUpdateUrl] = useState(config.updateUrl);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    onUpdateConfig({
      require2FA,
      sessionTimeout: Number(sessionTimeout),
      maxLoginAttempts: Number(maxLoginAttempts),
      projectId,
      maintenanceMode,
      maintenanceSplashMessage,
      maintenanceStartTime,
      maintenanceEndTime,
      announcementEnabled,
      announcementTitle,
      announcementBody,
      announcementPriority,
      panicTriggerKeyword,
      maxPinAttempts: Number(maxPinAttempts),
      alarmAudioConfig,
      defaultVolumeOverride: Number(defaultVolumeOverride),
      forceUpdate,
      minRequiredVersion,
      updateMessage,
      updateUrl
    });

    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto animate-fade-in text-white text-left">
      
      {/* Top action header trigger card */}
      <section className="bg-[#0c0b18] border border-[#1e1c31] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex flex-col text-left">
          <h3 className="font-sans font-bold text-base text-white">
            Global Policies & System Configurations
          </h3>
          <span className="font-sans text-xs text-[#8e8a9f] mt-1">
            Reconfigure zero-trust attributes, custom security anchors, and emergency protocol parameters.
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0 select-none">
          {success && (
            <span className="font-sans text-xs text-[#00f59b] animate-pulse font-semibold">
              ● All Policies Synchronized
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-[#6122e6] text-white font-sans text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-[#501bc5] transition-all cursor-pointer flex items-center gap-2 shadow-[0_4px_12px_rgba(97,34,230,0.3)]"
          >
            <RefreshCw className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
            <span>{saving ? "Syncing..." : "Apply System Policies"}</span>
          </button>
        </div>
      </section>

      {/* Main categories divisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left column: Hardware security protocols */}
        <div className="flex flex-col gap-6">
          
          {/* Box 1: Anti-Theft Device Panic Thresholds */}
          <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#1e1c31] pb-4">
              <ShieldAlert className="text-[#fc2e5c] w-5.5 h-5.5 shrink-0" />
              <h4 className="font-sans font-bold text-sm text-white">
                Physical Loss & Anti-Theft Policies
              </h4>
            </div>

            {/* Keyword block */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                Voice PANIC Trigger Keyword
              </label>
              <input
                type="text"
                className="w-full bg-[#131127] border border-[#252243] rounded-xl px-4 py-2.5 outline-none font-mono text-sm focus:border-[#6122e6] text-[#00f59b]"
                value={panicTriggerKeyword}
                onChange={(e) => setPanicTriggerKeyword(e.target.value)}
                placeholder="e.g. BREAK_PROTOCOLS"
              />
              <span className="font-sans text-[10px] text-[#8e8a9f] leading-normal mt-0.5">
                If spoken during high-stress encounters, the terminal instantly engages deep device destruction.
              </span>
            </div>

            {/* PIN limit */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between items-center">
                <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                  Max Unauthorized PIN Attempts
                </label>
                <span className="font-sans text-xs text-[#00f59b] font-bold">
                  {maxPinAttempts} attempts
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                className="w-full h-1 bg-[#1c1a36] rounded-lg appearance-none cursor-pointer accent-[#6122e6] my-3"
                value={maxPinAttempts}
                onChange={(e) => setMaxPinAttempts(Number(e.target.value))}
              />
              <span className="font-sans text-[10px] text-[#8e8a9f] leading-normal">
                Upon threshold breaching, encryption keys undergo instant cryptographic erasure.
              </span>
            </div>

            {/* Siren type selection */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                Emergency Alert Siren Sound
              </label>
              <select
                className="w-full bg-[#131127] border border-[#252243] rounded-xl px-4 py-2.5 outline-none font-sans text-sm focus:border-[#6122e6] text-white cursor-pointer"
                value={alarmAudioConfig}
                onChange={(e) => setAlarmAudioConfig(e.target.value)}
              >
                <option value="Siren - High Frequency">Siren - High Frequency</option>
                <option value="Acoustic Disruption Pulse">Acoustic Disruption Pulse</option>
                <option value="Silent Beacon Ping">Silent Beacon Ping</option>
              </select>
            </div>

            {/* Volume sliders override */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between items-center">
                <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                  Siren Volume Override (Enforced)
                </label>
                <span className="font-sans text-xs text-[#fc2e5c] font-bold">
                  {defaultVolumeOverride}% Volume
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full h-1 bg-[#1c1a36] rounded-lg appearance-none cursor-pointer accent-[#6122e6] my-3"
                value={defaultVolumeOverride}
                onChange={(e) => setDefaultVolumeOverride(Number(e.target.value))}
              />
            </div>

          </div>

          {/* Box 2: Maintenance schedule and configurations */}
          <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
            
            <div className="flex justify-between items-center border-b border-[#1e1c31] pb-4">
              <div className="flex items-center gap-3">
                <Wrench className="text-[#f59e0b] w-5.5 h-5.5 shrink-0" />
                <h4 className="font-sans font-bold text-sm text-white">
                  Maintenance Splash Protocols
                </h4>
              </div>

              {/* Maintenance ON/OFF Switch */}
              <div className="flex items-center gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    maintenanceMode ? "bg-[#f59e0b]" : "bg-[#252243]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      maintenanceMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className={`font-sans text-[10px] font-bold ${
                  maintenanceMode ? "text-[#f59e0b]" : "text-[#8e8a9f]/40"
                }`}>
                  {maintenanceMode ? "ACTIVE" : "BYPASSED"}
                </span>
              </div>
            </div>

            {/* Maintenance splash banner statement */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                Splash Warning Message
              </label>
              <textarea
                rows={3}
                disabled={!maintenanceMode}
                className="w-full bg-[#131127] border border-[#252243] rounded-xl px-4 py-2.5 outline-none font-sans text-sm focus:border-[#6122e6] text-white disabled:opacity-40 disabled:cursor-not-allowed"
                value={maintenanceSplashMessage}
                onChange={(e) => setMaintenanceSplashMessage(e.target.value)}
                placeholder="Message displayed to users when accessing systems under lockdown..."
              />
            </div>

            {/* Schedule boxes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                  Scheduled Start Time
                </label>
                <input
                  type="datetime-local"
                  disabled={!maintenanceMode}
                  className="w-full bg-[#131127] border border-[#252243] rounded-xl px-3 py-2 outline-none font-sans text-xs focus:border-[#6122e6] text-white disabled:opacity-40"
                  value={maintenanceStartTime}
                  onChange={(e) => setMaintenanceStartTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                  Estimated End Time
                </label>
                <input
                  type="datetime-local"
                  disabled={!maintenanceMode}
                  className="w-full bg-[#131127] border border-[#252243] rounded-xl px-3 py-2 outline-none font-sans text-xs focus:border-[#6122e6] text-white disabled:opacity-40"
                  value={maintenanceEndTime}
                  onChange={(e) => setMaintenanceEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Force Update Section */}
            <div className="border-t border-[#1e1c31] pt-5 mt-2">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="text-[#fc2e5c] w-5 h-5 shrink-0" />
                  <h4 className="font-sans font-bold text-sm text-white">
                    Force App Update
                  </h4>
                </div>
                <div className="flex items-center gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => setForceUpdate(!forceUpdate)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      forceUpdate ? "bg-[#fc2e5c]" : "bg-[#252243]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        forceUpdate ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className={`font-sans text-[10px] font-bold ${
                    forceUpdate ? "text-[#fc2e5c]" : "text-[#8e8a9f]/40"
                  }`}>
                    {forceUpdate ? "ENFORCED" : "OFF"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mb-4">
                <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                  Minimum Required Version
                </label>
                <input
                  type="text"
                  disabled={!forceUpdate}
                  className="w-full bg-[#131127] border border-[#252243] rounded-xl px-4 py-2.5 outline-none font-mono text-sm focus:border-[#6122e6] text-[#00f59b] disabled:opacity-40 disabled:cursor-not-allowed"
                  value={minRequiredVersion}
                  onChange={(e) => setMinRequiredVersion(e.target.value)}
                  placeholder="e.g. 2.0.0"
                />
                <span className="font-sans text-[10px] text-[#8e8a9f] leading-normal mt-0.5">
                  Devices running a version lower than this will be blocked until they update.
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-[#1e1c31]/50 mt-2">
                <span className="font-sans text-[10px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                  Current APK Version
                </span>
                <span className="font-mono text-xs text-[#00f59b] font-bold">1.0.0</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                  Update Prompt Message
                </label>
                <textarea
                  rows={2}
                  disabled={!forceUpdate}
                  className="w-full bg-[#131127] border border-[#252243] rounded-xl px-4 py-2.5 outline-none font-sans text-sm focus:border-[#6122e6] text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="Message shown to users who must update..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                  Update Button URL
                </label>
                <input
                  type="url"
                  disabled={!forceUpdate}
                  className="w-full bg-[#131127] border border-[#252243] rounded-xl px-4 py-2.5 outline-none font-sans text-sm focus:border-[#6122e6] text-[#00f59b] disabled:opacity-40 disabled:cursor-not-allowed"
                  value={updateUrl}
                  onChange={(e) => setUpdateUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=com.securphone.app"
                />
                <span className="font-sans text-[10px] text-[#8e8a9f] leading-normal mt-0.5">
                  The URL the update button redirects to. Leave empty to use Play Store default.
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Right column: global overlays and cloud configs */}
        <div className="flex flex-col gap-6">
          
          {/* Box 3: Global emergency overlay announcements */}
          <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
            
            <div className="flex justify-between items-center border-b border-[#1e1c31] pb-4">
              <div className="flex items-center gap-3">
                <Layers className="text-[#3b82f6] w-5.5 h-5.5 shrink-0" />
                <h4 className="font-sans font-bold text-sm text-white">
                  Global Dashboard Announcements
                </h4>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setAnnouncementEnabled(!announcementEnabled)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    announcementEnabled ? "bg-[#3b82f6]" : "bg-[#252243]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      announcementEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className={`font-sans text-[10px] font-bold ${
                  announcementEnabled ? "text-[#3b82f6]" : "text-[#8e8a9f]/40"
                }`}>
                  {announcementEnabled ? "ENABLED" : "MUTED"}
                </span>
              </div>
            </div>

            {/* Announcement Title */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                Overlay Header Title
              </label>
              <input
                type="text"
                disabled={!announcementEnabled}
                className="w-full bg-[#131127] border border-[#252243] rounded-xl px-4 py-2.5 outline-none font-sans text-sm focus:border-[#6122e6] text-white disabled:opacity-40"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                Overlay Announcement Narrative Body
              </label>
              <textarea
                rows={3}
                disabled={!announcementEnabled}
                className="w-full bg-[#131127] border border-[#252243] rounded-xl px-4 py-2.5 outline-none font-sans text-sm focus:border-[#6122e6] text-white disabled:opacity-40"
                value={announcementBody}
                onChange={(e) => setAnnouncementBody(e.target.value)}
              />
            </div>

            {/* Priority Selection */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="font-sans text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider">
                Display Urgency Level
              </label>
              <select
                disabled={!announcementEnabled}
                className="w-full bg-[#131127] border border-[#252243] rounded-xl px-4 py-2.5 outline-none font-sans text-sm focus:border-[#6122e6] text-white cursor-pointer disabled:opacity-40"
                value={announcementPriority}
                onChange={(e) => setAnnouncementPriority(e.target.value as any)}
              >
                <option value="Info">Info (Standard Slate Banner)</option>
                <option value="Warning">Warning (Yellow/Alert Alert)</option>
                <option value="Critical">Critical (Flashing Alarm Red)</option>
              </select>
            </div>

          </div>

          {/* Box 4: Server variables metadata */}
          <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#1e1c31] pb-4">
              <Database className="text-[#00f59b] w-5.5 h-5.5 shrink-0" />
              <h4 className="font-sans font-bold text-sm text-white">
                Production System Directories
              </h4>
            </div>

            <div className="flex flex-col gap-4 text-xs font-sans">
              <div className="flex justify-between items-center py-2 border-b border-[#1e1c31]/50">
                <span className="text-[#8e8a9f] uppercase text-[10px] font-semibold">Direct Project ID</span>
                <span className="text-white font-semibold font-mono">{projectId}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1e1c31]/50">
                <span className="text-[#8e8a9f] uppercase text-[10px] font-semibold">Stitch Release Ver</span>
                <span className="text-[#00f59b] font-bold">Stitch Secure v4.2.1-stable</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1e1c31]/50">
                <span className="text-[#8e8a9f] uppercase text-[10px] font-semibold">Global Server Area</span>
                <span className="text-white font-semibold font-mono">GCP-CloudRun::us-east-1</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#8e8a9f] uppercase text-[10px] font-semibold">Database Integration</span>
                <span className="text-[#f59e0b] font-bold font-mono">In-Memory Stateful Cache</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </form>
  );
}
