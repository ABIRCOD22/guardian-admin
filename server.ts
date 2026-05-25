/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guardian — Anti-Theft Admin Panel — Express + Firebase Admin SDK server.
 * Reads/writes the same Firestore collections as the Android app.
 * Sends FCM messages to devices for admin commands.
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import admin from "firebase-admin";
import type {
  AdminAccount,
  BroadcastNotification,
  EventLog,
  SecurityConfig,
  SecurityUser,
  LiveFeedItem,
  EventLogStatus
} from "./src/types.ts";

dotenv.config();

// ---------------------------------------------------------------------------
// Firebase Admin SDK Initialization
// ---------------------------------------------------------------------------
let firestore: admin.firestore.Firestore;
let messaging: admin.messaging.Messaging;

try {
  let serviceAccount: admin.ServiceAccount | null = null;

  // 1. Try FIREBASE_SERVICE_ACCOUNT_JSON env var (paste entire JSON as a Render secret)
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      serviceAccount = JSON.parse(jsonEnv) as admin.ServiceAccount;
      console.log("Loaded service account from FIREBASE_SERVICE_ACCOUNT_JSON env var.");
    } catch { console.warn("FIREBASE_SERVICE_ACCOUNT_JSON is set but invalid JSON."); }
  }

  // 2. Fallback to file path
  if (!serviceAccount) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./service-account.json";
    const fullPath = path.resolve(serviceAccountPath);
    if (fs.existsSync(fullPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      console.log("Loaded service account from", fullPath);
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    firestore = admin.firestore();
    messaging = admin.messaging();
    console.log("Firebase Admin SDK initialized successfully.");
  } else {
    console.warn("No service account found — running in in-memory fallback mode.");
  }
} catch (err) {
  console.error("Firebase Admin SDK init failed — falling back to in-memory mode.", err);
}

// ---------------------------------------------------------------------------
// In-memory fallback DB (used when Firebase is not configured)
// ---------------------------------------------------------------------------
const memDb: {
  admins: AdminAccount[];
  broadcasts: BroadcastNotification[];
  logs: EventLog[];
  config: SecurityConfig;
  users: SecurityUser[];
  feed: LiveFeedItem[];
} = {
  admins: [
    { id: "admin_1", name: "Abir (Specialist)", email: "abircod157@gmail.com", avatar: "", role: "Super Admin", lastLogin: "Just now" },
    { id: "admin_2", name: "Michael Chen", email: "m.chen@Guardian.sys", avatar: "", role: "Super Admin", lastLogin: "Today, 08:42 AM" },
    { id: "admin_3", name: "Sarah Jenkins", email: "s.jenkins@Guardian.sys", avatar: "", role: "Analyst", lastLogin: "Yesterday, 14:20 PM" }
  ],
  broadcasts: [],
  logs: [],
  config: {
    require2FA: true, sessionTimeout: 15, maxLoginAttempts: 3, projectId: process.env.FIREBASE_PROJECT_ID || "Guardian-prod",
    lastSync: "N/A", apiRequests24h: 0, maintenanceMode: false, maintenanceSplashMessage: "",
    maintenanceStartTime: "", maintenanceEndTime: "", announcementEnabled: false, announcementTitle: "",
    announcementBody: "", announcementPriority: "Info", panicTriggerKeyword: "ECLIPSE", maxPinAttempts: 5,
    alarmAudioConfig: "Siren - High Frequency", defaultVolumeOverride: 100
  },
  users: [],
  feed: []
};

function isFirebaseReady(): boolean {
  return !!firestore;
}

// ---------------------------------------------------------------------------
// Helper: map Firestore user doc → SecurityUser
// ---------------------------------------------------------------------------
async function userDocToSecurityUser(doc: admin.firestore.DocumentSnapshot): Promise<SecurityUser> {
  const d = doc.data() || {};
  const lastActive = d.lastActive?.toMillis?.() || d.lastActive || 0;
  const lastSync = d.lastSyncTimestamp?.toMillis?.() || d.lastSyncTimestamp || 0;
  const uninstalled = d.uninstalledAt?.toMillis?.() || 0;
  const diff = (ts: number) => { const s = Math.floor((Date.now() - ts) / 1000); if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; };
  let status: "Active" | "Inactive" | "Blocked" = d.isBlocked ? "Blocked" : "Inactive";
  if (!d.isBlocked && !uninstalled && lastActive > Date.now() - 86400000) status = "Active";
  if (uninstalled) status = "Inactive";
  return {
    id: doc.id,
    name: d.displayName || d.email || "Unknown",
    email: d.email || "",
    initials: ((d.displayName || d.email || "?").match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase() || "??",
    status,
    deviceModel: d.deviceModel || d.deviceInfo?.model || "Unknown",
    lastActive: uninstalled ? "App uninstalled" : (lastActive ? diff(lastActive) : "Never"),
    protectionActive: uninstalled ? false : (d.settings?.isProtectionActive ?? d.shieldActive ?? false),
    isPremium: d.memberStatus === "premium",
    deviceId: doc.id,
    osVersion: d.osVersion || d.deviceInfo?.osVersion || "Unknown",
    lastSync: uninstalled ? "N/A" : (lastSync ? diff(lastSync) : "Never")
  };
}

// ---------------------------------------------------------------------------
// Helper: map Firestore event doc → EventLog
// ---------------------------------------------------------------------------
function eventDocToEventLog(doc: admin.firestore.DocumentSnapshot): EventLog {
  const d = doc.data() || {};
  const ts = d.timestamp?.toMillis?.() || d.timestamp || Date.now();
  const fmt = new Date(ts).toISOString().replace("T", " ").substring(0, 23) + " UTC";
  const typeMap: Record<string, "Trigger" | "Alarm" | "Access"> = {
    trigger_activated: "Trigger", alarm_started: "Alarm", pin_correct: "Access",
    pin_failed: "Access", pin_failed_lockout: "Trigger", admin_disabled: "Access"
  };
  return {
    id: doc.id,
    timestamp: fmt,
    type: d.type ? (typeMap[d.type] || "Trigger") : "Trigger",
    source: d.triggerSource || "system",
    userEntity: d.userId || "anon",
    details: d.type || "Unknown event",
    location: d.latitude && d.longitude ? `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}` : "N/A",
    status: d.resolved ? "Resolved" as const : "Logged" as const,
    payload: (d.metadata as Record<string, any>) || {},
    actionTrail: (d.notes as string[] || []).map((n: string) => ({
      text: n, timestamp: fmt, icon: "radio_button_checked" as const, color: "primary" as const
    }))
  };
}

// ---------------------------------------------------------------------------
// Helper: send FCM to a specific user; marks user uninstalled on failure
// ---------------------------------------------------------------------------
async function sendFcmToUser(userId: string, data: Record<string, string>): Promise<boolean> {
  if (!isFirebaseReady()) return false;
  try {
    const doc = await firestore.collection("users").doc(userId).get();
    const token = doc.data()?.fcmToken;
    if (!token) return false;
    await messaging.send({ token, data, android: { priority: "high" } });
    return true;
  } catch (err: any) {
    const errCode = err?.errorInfo?.code || err?.code || "";
    if (errCode === "messaging/registration-token-not-registered") {
      await firestore.collection("users").doc(userId).update({
        fcmToken: admin.firestore.FieldValue.delete(),
        isBlocked: true,
        "settings.isProtectionActive": false,
        shieldActive: false,
        uninstalledAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    return false;
  }
}

async function sendFcmToToken(userDoc: admin.firestore.DocumentSnapshot, data: Record<string, string>): Promise<boolean> {
  const token = userDoc.data()?.fcmToken;
  if (!token) return false;
  try {
    await messaging.send({ token, data, android: { priority: "high" } });
    return true;
  } catch (err: any) {
    const errCode = err?.errorInfo?.code || err?.code || "";
    if (errCode === "messaging/registration-token-not-registered") {
      await userDoc.ref.update({
        fcmToken: admin.firestore.FieldValue.delete(),
        isBlocked: true,
        "settings.isProtectionActive": false,
        shieldActive: false,
        uninstalledAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper: add live feed entry in Firestore audit_logs
// ---------------------------------------------------------------------------
async function addFeedEntry(text: string, type: "sync" | "block" | "key_rotation" = "sync"): Promise<void> {
  if (!isFirebaseReady()) return;
  try {
    await firestore.collection("audit_logs").add({
      action: `feed_${type}`,
      category: "feed",
      description: text,
      metadata: { feedType: type },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// Express setup
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());
const PORT = parseInt(process.env.PORT || "3000", 10);

// Google GenAI client
let ai: GoogleGenAI | null = null;
try {
  const geminiApiKey = process.env.GEMINI_API_KEY || "";
  if (geminiApiKey) {
    ai = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    console.log("Gemini API client initialized.");
  }
} catch { console.error("Gemini init failed."); }

// ---------------------------------------------------------------------------
// CORS middleware (allows Netlify frontend to call this backend)
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:3000").split(",").map(s => s.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// =========================================================================
// API ROUTES
// =========================================================================

// GET /api/state — fetch full app state
app.get("/api/state", async (req, res) => {
  if (!isFirebaseReady()) return res.json(memDb);
  try {
    const [userSnap, eventSnap, broadcastSnap, adminSnap, policySnap] = await Promise.all([
      firestore.collection("users").get(),
      firestore.collection("events").orderBy("timestamp", "desc").limit(10).get(),
      firestore.collection("broadcasts").orderBy("createdAt", "desc").limit(20).get(),
      firestore.collection("admins").get(),
      firestore.collection("policies").doc("global").get()
    ]);

    const users = await Promise.all(userSnap.docs.map(userDocToSecurityUser));
    const logs = eventSnap.docs.map(eventDocToEventLog);
    const broadcasts: BroadcastNotification[] = broadcastSnap.docs.map(d => {
      const dd = d.data();
      const ts = dd.createdAt?.toMillis?.() || Date.now();
      return {
        id: d.id, title: dd.title || "", body: dd.body || "",
        targetAudience: dd.audience || "global", actionUrl: dd.actionUri || "",
        status: (dd.status as BroadcastNotification["status"]) || "Draft",
        timestamp: new Date(ts).toLocaleString(), deliveryRate: dd.successPercentage
      };
    });
    const admins: AdminAccount[] = adminSnap.docs.map(d => {
      const dd = d.data();
      return {
        id: d.id, name: dd.displayName || dd.email || "", email: dd.email || "",
        avatar: "", role: (dd.role === "Analyst" ? "Analyst" : "Super Admin") as "Super Admin" | "Analyst",
        lastLogin: dd.lastActive ? new Date(dd.lastActive?.toMillis?.() || dd.lastActive).toLocaleString() : "Never"
      };
    });
    const policy = policySnap.data() || {};
    const config: SecurityConfig = {
      require2FA: true, sessionTimeout: 15, maxLoginAttempts: 3,
      projectId: process.env.FIREBASE_PROJECT_ID || "",
      lastSync: "Live", apiRequests24h: 0, maintenanceMode: policy.maintenanceMode || false,
      maintenanceSplashMessage: policy.maintenanceMessage || "",
      maintenanceStartTime: "", maintenanceEndTime: "",
      announcementEnabled: !!policy.globalAnnouncement,
      announcementTitle: "", announcementBody: policy.globalAnnouncement || "",
      announcementPriority: (policy.announcementSeverity === "warning" ? "Warning" : policy.announcementSeverity === "critical" ? "Critical" : "Info") as "Info" | "Warning" | "Critical",
      panicTriggerKeyword: policy.panicTriggerKeyword || "ECLIPSE", maxPinAttempts: policy.maxPinAttempts || 5,
      alarmAudioConfig: policy.sirenType || "Siren - High Frequency", defaultVolumeOverride: 100
    };
    const feed: LiveFeedItem[] = [];

    res.json({ admins, broadcasts, logs, config, users, feed });
  } catch (err) {
    console.error("Fetch state error:", err);
    res.json(memDb);
  }
});

// POST /api/users/toggle-protection — toggle device shield
app.post("/api/users/toggle-protection", async (req, res) => {
  const { id } = req.body;
  if (!isFirebaseReady()) {
    const user = memDb.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: "User not found." });
    user.protectionActive = !user.protectionActive;
    return res.json({ success: true, user });
  }
  try {
    const doc = await firestore.collection("users").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found." });
    if (doc.data()?.uninstalledAt) return res.status(400).json({ error: "User not available — app has been uninstalled." });
    if (!doc.data()?.fcmToken) return res.status(400).json({ error: "User not available — no device registered." });

    const current = doc.data()?.settings?.isProtectionActive ?? doc.data()?.shieldActive ?? false;
    const newState = !current;

    // Send FCM first — if it fails (unregistered), device is gone
    const fcmSent = await sendFcmToUser(id, { action: "toggle_shield", active: String(newState) });

    // Re-check after sendFcmToUser in case it marked as uninstalled
    const freshDoc = await firestore.collection("users").doc(id).get();
    if (freshDoc.data()?.uninstalledAt) {
      return res.status(400).json({ error: "Cannot toggle protection — device has been uninstalled." });
    }

    await firestore.collection("users").doc(id).update({
      "settings.isProtectionActive": newState,
      shieldActive: newState
    });
    await addFeedEntry(`Protection toggled to ${newState} for device ${id}`, "sync");
    const user = await userDocToSecurityUser(freshDoc);
    user.protectionActive = newState;
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/users/toggle-status — block/unblock user
app.post("/api/users/toggle-status", async (req, res) => {
  const { id, status } = req.body;
  if (!isFirebaseReady()) {
    const user = memDb.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: "User not found." });
    user.status = status;
    return res.json({ success: true, user });
  }
  try {
    const doc = await firestore.collection("users").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found." });
    if (doc.data()?.uninstalledAt) return res.status(400).json({ error: "User not available — app has been uninstalled." });
    if (!doc.data()?.fcmToken) return res.status(400).json({ error: "User not available — no device registered." });

    const isBlocked = status === "Blocked";
    await firestore.collection("users").doc(id).update({ isBlocked });
    if (isBlocked) {
      await sendFcmToUser(id, { action: "kill_connection" });
    }
    await addFeedEntry(`User ${id} status changed to ${status}`, isBlocked ? "block" : "sync");
    const user = await userDocToSecurityUser(doc);
    user.status = status;
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/broadcasts — create and send broadcast
app.post("/api/broadcasts", async (req, res) => {
  const { title, body, targetAudience, actionUrl } = req.body;
  if (!title || !body) return res.status(400).json({ error: "Title and Body required." });
  const broadcast = {
    title, body, audience: targetAudience || "global",
    actionUri: actionUrl || "", status: "sent",
    deliveredCount: 0, successPercentage: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (!isFirebaseReady()) {
    const bc: BroadcastNotification = {
      id: "bc_" + (memDb.broadcasts.length + 1), title, body,
      targetAudience: targetAudience || "All Active Devices", actionUrl: actionUrl || "",
      status: "Sent", timestamp: new Date().toLocaleString(), deliveryRate: 100
    };
    memDb.broadcasts.unshift(bc);
    memDb.feed.unshift({ id: "feed_bc_" + Date.now(), type: "sync", text: `Broadcast: ${title}`, timestamp: "Just now" });
    return res.json({ success: true, broadcast: bc });
  }
  try {
    const ref = await firestore.collection("broadcasts").add(broadcast);
    // Send FCM to all active users with fcmToken
    const userSnap = await firestore.collection("users").where("fcmToken", "!=", "").get();
    let sent = 0;
    const fcmData: Record<string, string> = {
      action: "send_broadcast", title, body, message: body,
      ...(actionUrl ? { actionUrl } : {})
    };
    for (const userDoc of userSnap.docs) {
      const audienceMatch =
        targetAudience === "global" ? true :
        targetAudience === "premium" ? userDoc.data()?.memberStatus === "premium" :
        targetAudience === "legacy_os" ? (userDoc.data()?.osVersion || "").includes("Android") : true;
      if (!audienceMatch) continue;
      if (await sendFcmToToken(userDoc, fcmData)) sent++;
    }
    await addFeedEntry(`Broadcast "${title}" sent to ${sent} devices`, "sync");
    res.json({ success: true, broadcast: { id: ref.id, ...broadcast, deliveredCount: sent, successPercentage: sent > 0 ? 100 : 0 } });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/configs — update security policies
app.post("/api/configs", async (req, res) => {
  const updates = req.body;
  if (!isFirebaseReady()) {
    Object.assign(memDb.config, updates);
    return res.json({ success: true, config: memDb.config });
  }
  try {
    const mapped: Record<string, any> = {};
    if (updates.panicTriggerKeyword !== undefined) mapped.panicTriggerKeyword = updates.panicTriggerKeyword;
    if (updates.maxPinAttempts !== undefined) mapped.maxPinAttempts = updates.maxPinAttempts;
    if (updates.alarmAudioConfig !== undefined) mapped.sirenType = updates.alarmAudioConfig;
    if (updates.defaultVolumeOverride !== undefined) mapped.defaultVolumeOverride = updates.defaultVolumeOverride;
    if (updates.maintenanceMode !== undefined) mapped.maintenanceMode = updates.maintenanceMode;
    if (updates.maintenanceSplashMessage !== undefined) mapped.maintenanceMessage = updates.maintenanceSplashMessage;
    if (updates.announcementBody !== undefined) mapped.globalAnnouncement = updates.announcementBody;
    if (updates.announcementPriority !== undefined) mapped.announcementSeverity = updates.announcementPriority.toLowerCase();
    mapped.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await firestore.collection("policies").doc("global").set(mapped, { merge: true });
    // Force remote config refresh on all devices
    const userSnap = await firestore.collection("users").where("fcmToken", "!=", "").get();
    for (const userDoc of userSnap.docs) {
      await sendFcmToToken(userDoc, { action: "update_policy" });
    }
    await addFeedEntry("Security policies updated fleet-wide", "key_rotation");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/admins — add new admin
app.post("/api/admins", async (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Name and Email required." });
  if (!isFirebaseReady()) {
    const na: AdminAccount = { id: "admin_" + (memDb.admins.length + 1), name, email, avatar: "", role: role || "Analyst", lastLogin: "Never" };
    memDb.admins.push(na);
    return res.json({ success: true, admin: na });
  }
  try {
    const ref = await firestore.collection("admins").add({
      email, displayName: name, role: role || "analyst",
      permissions: role === "Super Admin" ? ["*"] : ["read", "analytics"],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await addFeedEntry(`New admin ${name} added`, "sync");
    res.json({ success: true, admin: { id: ref.id, name, email, avatar: "", role: role || "Analyst", lastLogin: "Never" } });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/audit — Gemini-powered security audit
app.post("/api/audit", async (req, res) => {
  const { prompt } = req.body;

  // Gather live data
  let activePolicies: any = memDb.config;
  let usersSummary: any[] = memDb.users;
  let adminsSummary: any[] = memDb.admins;
  let broadcastsSummary: any[] = memDb.broadcasts;
  let eventLogs: any[] = memDb.logs;
  let feedSummary: any[] = memDb.feed;

  if (isFirebaseReady()) {
    try {
      const [userSnap, eventSnap, broadcastSnap, adminSnap, policySnap] = await Promise.all([
        firestore.collection("users").get(),
        firestore.collection("events").orderBy("timestamp", "desc").limit(50).get(),
        firestore.collection("broadcasts").orderBy("createdAt", "desc").limit(20).get(),
        firestore.collection("admins").get(),
        firestore.collection("policies").doc("global").get()
      ]);
      usersSummary = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      eventLogs = eventSnap.docs.map(eventDocToEventLog);
      broadcastsSummary = broadcastSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      adminsSummary = adminSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const p = policySnap.data() || {};
      activePolicies = {
        require2FA: true, sessionTimeout: 15, maxLoginAttempts: 3, maxPinAttempts: p.maxPinAttempts || 5,
        panicTriggerKeyword: p.panicTriggerKeyword || "ECLIPSE", maintenanceMode: p.maintenanceMode || false,
        alarmAudioConfig: p.sirenType || "Siren - High Frequency", defaultVolumeOverride: 100
      };
    } catch {}
  }

  const fullSystemDataString = JSON.stringify({
    activeSecurityPolicies: activePolicies,
    registeredUserDevices: usersSummary,
    enrolledSecurityOperators: adminsSummary,
    broadcastTransmissionLogs: broadcastsSummary,
    threatSignalsAndEventLogs: eventLogs,
    liveDiagnosticActivityFeed: feedSummary
  }, null, 2);

  const userRequestText = prompt
    ? `User specific audit query: "${prompt}"`
    : `Run a general, holistic security health assessment of the Guardian network.`;

  // Local heuristic fallback
  const getLocalHeuristicReport = (rawPrompt: string): string => {
    const norm = (rawPrompt || "").toLowerCase().trim();
    if (norm.includes("admin") || norm.includes("operator")) {
      const rows = (adminsSummary as any[]).map((a: any) => `- **${a.displayName || a.name}** — \`${a.email}\` | Role: \`${a.role}\``).join("\n");
      return `# Enrolled Security Operators\n${rows || "No admins found."}\n`;
    }
    if (norm.includes("user") || norm.includes("device") || norm.includes("fleet")) {
      const rows = (usersSummary as any[]).map((u: any) =>
        `- **${u.displayName || u.email}** | Device: \`${u.deviceModel || "Unknown"}\` | Shield: **${u.settings?.isProtectionActive ? "ACTIVE" : "INACTIVE"}** | OS: \`${u.osVersion || "N/A"}\``
      ).join("\n");
      return `# Registered Fleet Devices\n${rows || "No users found."}\n`;
    }
    if (norm.includes("policy") || norm.includes("config")) {
      return `# Security Policies\n- **Panic Keyword:** \`${activePolicies.panicTriggerKeyword}\`\n- **Max PIN Attempts:** \`${activePolicies.maxPinAttempts}\`\n- **Maintenance:** ${activePolicies.maintenanceMode ? "**ACTIVE**" : "**INACTIVE**"}\n`;
    }
    if (norm.includes("log") || norm.includes("event") || norm.includes("threat") || norm.includes("audit")) {
      const rows = (eventLogs as any[]).slice(0, 5).map((l: any) =>
        `- **[${l.type}]** ${l.details} — ${l.timestamp} (${l.status})`
      ).join("\n");
      return `# Recent Security Events\n${rows || "No events found."}\n`;
    }
    return `# Guardian Systems Status\n- **Active Endpoints:** ${usersSummary.length}\n- **Pending Events:** ${eventLogs.length}\n- **Broadcasts Sent:** ${broadcastsSummary.length}\n- **System Health:** Operational\n`;
  };

  if (!ai) {
    const backupReport = getLocalHeuristicReport(prompt || "");
    return res.json({ report: backupReport || "# Guardian Operational Audit Report\nAI services offline. Running heuristics.\n" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: `You are the "Cyber Sentinel AI Auditor" integrated into the Guardian admin dashboard. You have live access to the full database.

Below is the COMPLETE database state:
----------------------------------------
${fullSystemDataString}
----------------------------------------

Instructions:
- For greetings ("hi", "hello", "hey"): respond with a brief 1-2 line security operator salute.
- For specific queries about users/admins/events/broadcasts: answer precisely from the data.
- For audit requests: output a multi-section security assessment with markdown formatting.

${userRequestText}

Format in polished Markdown with headings, bold indicators, and code blocks where appropriate.`
    });
    const report = response.text || "Failed to generate audit.";
    res.json({ report });
  } catch (error) {
    console.error("Gemini audit failed, using local heuristic:", error);
    const backupReport = getLocalHeuristicReport(prompt);
    res.json({ report: backupReport });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
(async () => {
  if (process.env.NODE_ENV !== "production") {
    // Dev: Vite middleware serves React front-end
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built front-end from dist/
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Guardian Admin API server running on port ${PORT}`);
  });
})();
