import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SecurityUser } from "../types.js";
import { MapPin, Navigation, AlertTriangle, Shield, Bell, Send, Radio, Phone } from "lucide-react";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const emergencyIcon = L.divIcon({
  className: "custom-emergency-marker",
  html: `<div style="width:32px;height:32px;background:#ff1744;border:3px solid white;border-radius:50%;box-shadow:0 0 20px #ff1744;display:flex;align-items:center;justify-content:center;animation:pulse 1.5s infinite;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const activeIcon = L.divIcon({
  className: "custom-active-marker",
  html: `<div style="width:28px;height:28px;background:#00f59b;border:3px solid white;border-radius:50%;box-shadow:0 0 15px #00f59b88;display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06050e" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const inactiveIcon = L.divIcon({
  className: "custom-inactive-marker",
  html: `<div style="width:24px;height:24px;background:#8e8a9f;border:2px solid #4a4766;border-radius:50%;opacity:0.6;display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a1835" stroke-width="3"><circle cx="12" cy="12" r="10"/></svg></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface LiveMapViewProps {
  users: SecurityUser[];
  onSendCommand: (userId: string, command: string) => void;
  onSendAlert: () => void;
}

interface EmergencyEvent {
  id: string;
  type: string;
  message: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  status: string;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevCenter = useRef(center);
  useEffect(() => {
    if (prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1]) {
      map.setView(center, zoom, { animate: true });
      prevCenter.current = center;
    }
  }, [center, zoom, map]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 0);
  }, [map]);
  return null;
}

function TileFallback({ onFallback }: { onFallback: () => void }) {
  const map = useMap();
  const fallbackRef = useRef(onFallback);
  fallbackRef.current = onFallback;
  useEffect(() => {
    const handler = () => fallbackRef.current();
    map.on("tileerror", handler);
    return () => map.off("tileerror", handler);
  }, [map]);
  return null;
}

export default function LiveMapView({ users, onSendCommand, onSendAlert }: LiveMapViewProps) {
  const [center, setCenter] = useState<[number, number]>([23.685, 90.3563]);
  const [zoom, setZoom] = useState(6);
  const [emergencies, setEmergencies] = useState<EmergencyEvent[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false);
  const [liveAlertMessage, setLiveAlertMessage] = useState("");

  const [tileUrl, setTileUrl] = useState("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png");
  const handleTileError = useCallback(() => {
    setTileUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
  }, []);

  const activeUsers = users.filter(u => u.protectionActive && u.lastLatitude && u.lastLongitude);
  const emergencyUsers = users.filter(u => u.alarmActive && u.lastLatitude && u.lastLongitude);
  const inactiveUsers = users.filter(u => (!u.protectionActive || !u.lastLatitude) && u.lastLatitude && u.lastLongitude);

  const fetchEmergencies = useCallback(async () => {
    try {
      const res = await fetch("/api/emergencies");
      if (res.ok) {
        const data = await res.json();
        setEmergencies(data.emergencies || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 30000);
    return () => clearInterval(interval);
  }, [fetchEmergencies]);

  useEffect(() => {
    if (emergencyUsers.length > 0 && emergencyUsers[0].lastLatitude && emergencyUsers[0].lastLongitude) {
      setCenter([emergencyUsers[0].lastLatitude, emergencyUsers[0].lastLongitude]);
      setZoom(14);
    } else if (activeUsers.length > 0 && activeUsers[0].lastLatitude && activeUsers[0].lastLongitude) {
      setCenter([activeUsers[0].lastLatitude, activeUsers[0].lastLongitude]);
      setZoom(12);
    }
  }, [emergencyUsers.length, activeUsers.length]);

  const handleCommand = async (userId: string, command: string) => {
    setCommandLoading(command);
    setCommandResult(null);
    try {
      const res = await fetch("/api/device/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, command }),
      });
      const data = await res.json();
      setCommandResult(data.success ? `Command "${command}" sent successfully` : `Failed: ${data.error}`);
    } catch (err: any) {
      setCommandResult(`Error: ${err.message}`);
    }
    setCommandLoading(null);
    setTimeout(() => setCommandResult(null), 4000);
  };

  const handleGlobalAlert = async () => {
    if (!liveAlertMessage.trim()) return;
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "LIVE ALERT",
          body: liveAlertMessage,
          targetAudience: "all",
          actionUrl: "",
          scheduleForLater: false,
          schedule: "",
        }),
      });
      if (res.ok) {
        setLiveAlertMessage("");
        onSendAlert();
      }
    } catch {}
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Command result toast */}
      {commandResult && (
        <div className="fixed top-4 right-4 z-[9999] px-5 py-3 bg-[#1a1835] border border-[#6122e6]/40 rounded-xl shadow-2xl text-sm text-white font-medium animate-in slide-in-from-right">
          {commandResult}
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-[#8e8a9f] font-medium uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#00f59b]" />
            Total Devices
          </div>
          <span className="text-2xl font-bold text-white">{users.filter(u => u.lastLatitude).length}</span>
        </div>
        <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-[#8e8a9f] font-medium uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5 text-[#00f59b]" />
            Protected
          </div>
          <span className="text-2xl font-bold text-[#00f59b]">{activeUsers.length}</span>
        </div>
        <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-[#8e8a9f] font-medium uppercase tracking-wider mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ff1744]" />
            Emergencies
          </div>
          <span className="text-2xl font-bold text-[#ff1744]">{emergencyUsers.length + emergencies.length}</span>
        </div>
        <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-[#8e8a9f] font-medium uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5 text-[#ffea2a]" />
            Alerts Today
          </div>
          <span className="text-2xl font-bold text-[#ffea2a]">{emergencies.filter(e => e.type === "emergency").length}</span>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* MAP */}
        <div className="flex-1 bg-[#0c0b18] border border-[#1e1c31] relative">
          <style>{`
            @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.7; } }
            .leaflet-container { background: #0c0b18 !important; }
            .leaflet-control-zoom a { background: #1a1835 !important; color: white !important; border-color: #2d2854 !important; }
            .leaflet-control-attribution { display: none !important; }
          `}</style>
          <MapContainer
            center={center}
            zoom={zoom}
            className="w-full h-full"
            zoomControl={true}
            style={{ borderRadius: "inherit" }}
          >
            <MapController center={center} zoom={zoom} />
            <MapResizer />
            <TileFallback onFallback={handleTileError} />
            <TileLayer
              key={tileUrl}
              url={tileUrl}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />
            {/* Emergency circles */}
            {emergencies.map(e => (
              <Circle
                key={e.id}
                center={[e.latitude, e.longitude]}
                radius={500}
                pathOptions={{ color: "#ff1744", fillColor: "#ff1744", fillOpacity: 0.1, weight: 1 }}
              />
            ))}

            {/* Inactive user markers */}
            {inactiveUsers.map(u => (
              u.lastLatitude && u.lastLongitude && (
                <Marker
                  key={`inactive-${u.id}`}
                  position={[u.lastLatitude, u.lastLongitude]}
                  icon={inactiveIcon}
                >
                  <Popup>
                    <div className="font-sans text-sm">
                      <strong>{u.name}</strong><br />
                      <span className="text-xs text-gray-500">Inactive</span>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}

            {/* Active user markers */}
            {activeUsers.map(u => (
              u.lastLatitude && u.lastLongitude && (
                <Marker
                  key={`active-${u.id}`}
                  position={[u.lastLatitude, u.lastLongitude]}
                  icon={activeIcon}
                >
                  <Popup>
                    <div className="font-sans text-sm min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-[#00f59b]" />
                        <strong className="text-base">{u.name}</strong>
                      </div>
                      <div className="space-y-1 text-xs text-gray-400">
                        <p>Device: {u.deviceModel}</p>
                        <p>Last sync: {u.lastSync}</p>
                        <p className="text-[#00f59b]">Protection Active</p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleCommand(u.id, "locate")}
                          disabled={commandLoading === "locate"}
                          className="flex-1 px-2 py-1.5 bg-[#6122e6] hover:bg-[#7c3aed] disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
                        >
                          {commandLoading === "locate" ? "..." : "Locate"}
                        </button>
                        <button
                          onClick={() => handleCommand(u.id, "siren")}
                          disabled={commandLoading === "siren"}
                          className="flex-1 px-2 py-1.5 bg-[#ff1744] hover:bg-[#ff5252] disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
                        >
                          {commandLoading === "siren" ? "..." : "Siren"}
                        </button>
                        <button
                          onClick={() => handleCommand(u.id, "disarm")}
                          disabled={commandLoading === "disarm"}
                          className="flex-1 px-2 py-1.5 bg-[#1e1c31] hover:bg-[#2d2854] disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
                        >
                          {commandLoading === "disarm" ? "..." : "Disarm"}
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}

            {/* Emergency markers */}
            {emergencies.map(e => (
              <Marker
                key={`emergency-${e.id}`}
                position={[e.latitude, e.longitude]}
                icon={emergencyIcon}
              >
                <Popup>
                  <div className="font-sans text-sm min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2 text-[#ff1744]">
                      <AlertTriangle className="w-4 h-4" />
                      <strong className="text-base">EMERGENCY</strong>
                    </div>
                    <p className="text-xs mb-1">{e.message}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-[#ffea2a] mt-1">Status: {e.status}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Emergency user markers */}
            {emergencyUsers.map(u => (
              u.lastLatitude && u.lastLongitude && (
                <Marker
                  key={`emergency-user-${u.id}`}
                  position={[u.lastLatitude, u.lastLongitude]}
                  icon={emergencyIcon}
                >
                  <Popup>
                    <div className="font-sans text-sm min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2 text-[#ff1744]">
                        <AlertTriangle className="w-4 h-4" />
                        <strong className="text-base">ALARM ACTIVE</strong>
                      </div>
                      <p className="font-bold mb-1">{u.name}</p>
                      <div className="space-y-1 text-xs text-gray-400">
                        <p>Device: {u.deviceModel}</p>
                        <p>Last sync: {u.lastSync}</p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleCommand(u.id, "disarm")}
                          className="flex-1 px-2 py-1.5 bg-[#ff1744] hover:bg-[#ff5252] rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
                        >
                          Stop Alarm
                        </button>
                        <button
                          onClick={() => handleCommand(u.id, "locate")}
                          className="flex-1 px-2 py-1.5 bg-[#6122e6] hover:bg-[#7c3aed] rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
                        >
                          Locate
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>

          {/* Map overlay controls */}
          <div className="absolute top-4 left-4 z-[1000] flex gap-2">
            <button
              onClick={() => { setZoom(6); setCenter([23.685, 90.3563]); }}
              className="px-3 py-1.5 bg-[#1a1835]/90 backdrop-blur border border-[#2d2854] rounded-lg text-xs text-white font-medium hover:bg-[#2d2854] transition-all cursor-pointer"
            >
              Reset View
            </button>
            <button
              onClick={() => setShowEmergencyPanel(true)}
              className="px-3 py-1.5 bg-[#ff1744]/90 backdrop-blur border border-[#ff1744]/30 rounded-lg text-xs text-white font-medium hover:bg-[#ff1744] transition-all cursor-pointer"
            >
              Emergencies ({emergencies.length + emergencyUsers.length})
            </button>
          </div>

          {/* Live status indicator */}
          <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-2 px-3 py-1.5 bg-[#1a1835]/80 backdrop-blur rounded-lg border border-[#2d2854]">
            <span className="w-2 h-2 rounded-full bg-[#00f59b] animate-pulse" />
            <span className="text-[10px] text-[#8e8a9f] font-mono uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-72 flex flex-col gap-3">
          {/* Send Global Alert */}
          <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#ffea2a]" />
              Send Alert
            </h3>
            <textarea
              value={liveAlertMessage}
              onChange={e => setLiveAlertMessage(e.target.value)}
              placeholder="Type alert message..."
              className="w-full bg-[#131127] border border-[#252243] rounded-lg px-3 py-2 text-xs text-white placeholder-[#8e8a9f] resize-none h-20 focus:outline-none focus:border-[#6122e6] transition-colors"
            />
            <button
              onClick={handleGlobalAlert}
              disabled={!liveAlertMessage.trim()}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#6122e6] hover:bg-[#7c3aed] disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Broadcast Alert
            </button>
          </div>

          {/* Device List */}
          <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-xl p-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#00f59b]" />
              Tracked Devices
            </h3>
            <div className="space-y-2">
              {users.filter(u => u.lastLatitude).length === 0 && (
                <p className="text-xs text-[#8e8a9f] text-center py-4">No devices with location data yet.</p>
              )}
              {users.filter(u => u.lastLatitude).map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    if (u.lastLatitude && u.lastLongitude) {
                      setCenter([u.lastLatitude, u.lastLongitude]);
                      setZoom(16);
                    }
                    setSelectedUserId(u.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
                    selectedUserId === u.id ? "bg-[#1d1a36] border border-[#2d2854]" : "bg-[#131127] hover:bg-[#1a1835] border border-transparent"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    u.alarmActive ? "bg-[#ff1744] animate-pulse" :
                    u.protectionActive ? "bg-[#00f59b]" : "bg-[#8e8a9f]"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                    <p className="text-[10px] text-[#8e8a9f] truncate">{u.deviceModel}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCommand(u.id, "locate"); }}
                      className="p-1 hover:bg-[#2d2854] rounded transition-all"
                      title="Locate"
                    >
                      <MapPin className="w-3 h-3 text-[#00f59b]" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCommand(u.id, "siren"); }}
                      className="p-1 hover:bg-[#2d2854] rounded transition-all"
                      title="Trigger Siren"
                    >
                      <Radio className="w-3 h-3 text-[#ff1744]" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Events Panel */}
      {showEmergencyPanel && (
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowEmergencyPanel(false)}>
          <div className="bg-[#0c0b18] border border-[#1e1c31] rounded-2xl w-[500px] max-h-[70vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#1e1c31] flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#ff1744]" />
                Emergency Events
              </h2>
              <button
                onClick={() => setShowEmergencyPanel(false)}
                className="text-[#8e8a9f] hover:text-white text-2xl cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-3">
              {emergencies.length === 0 && emergencyUsers.length === 0 && (
                <p className="text-sm text-[#8e8a9f] text-center py-4">No emergency events.</p>
              )}
              {emergencyUsers.map(u => (
                <div key={u.id} className="bg-[#1a0000] border border-[#ff1744]/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#ff1744] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {u.name}
                    </span>
                    <span className="text-[10px] text-[#ff1744]/60 font-mono">{u.lastSync}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">Device: {u.deviceModel}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCommand(u.id, "disarm")}
                      className="px-3 py-1.5 bg-[#ff1744] hover:bg-[#ff5252] rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
                    >
                      Stop Alarm
                    </button>
                    <button
                      onClick={() => handleCommand(u.id, "locate")}
                      className="px-3 py-1.5 bg-[#6122e6] hover:bg-[#7c3aed] rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
                    >
                      Locate Now
                    </button>
                  </div>
                </div>
              ))}
              {emergencies.map(e => (
                <div key={e.id} className="bg-[#1a0000] border border-[#ff1744]/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#ff1744] uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {e.type}
                    </span>
                    <span className="text-[10px] text-gray-500">{new Date(e.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-white mb-1">{e.message}</p>
                  <p className="text-xs text-gray-400">
                    Location: {e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}
                  </p>
                  <p className="text-xs text-[#ffea2a]">Status: {e.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
