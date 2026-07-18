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
    announcementBody: "", announcementPriority: "Info",     panicTriggerKeyword: "Where are you", maxPinAttempts: 5,
    alarmAudioConfig: "Siren - High Frequency", defaultVolumeOverride: 100,
    forceUpdate: false, minRequiredVersion: "1.0.0", updateMessage: "", updateUrl: ""
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
  let lat = d.lastLatitude;
  let lng = d.lastLongitude;
  if ((lat == null || lng == null) && d.deviceInfo) {
    lat = d.deviceInfo.lastLatitude;
    lng = d.deviceInfo.lastLongitude;
  }

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
    lastSync: uninstalled ? "N/A" : (lastSync ? diff(lastSync) : "Never"),
    alarmActive: !!d.alarmActive,
    lastLatitude: lat ?? undefined,
    lastLongitude: lng ?? undefined
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

// Structured request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
    console.log(`[${new Date().toISOString()}] [${level}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
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
      panicTriggerKeyword: policy.panicTriggerKeyword || "Where are you", maxPinAttempts: policy.maxPinAttempts || 5,
      alarmAudioConfig: policy.sirenType || "Siren - High Frequency", defaultVolumeOverride: 100,
      forceUpdate: policy.forceUpdate || false,
      minRequiredVersion: policy.minRequiredVersion || "1.0.0",
      updateMessage: policy.updateMessage || "",
      updateUrl: policy.updateUrl || ""
    };
    const feed: LiveFeedItem[] = [];

    res.json({ admins, broadcasts, logs, config, users, feed });
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] GET /api/state:`, err);
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
    console.error(`[ERROR] [${new Date().toISOString()}] POST /api/users/toggle-protection:`, err);
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
    console.error(`[ERROR] [${new Date().toISOString()}] POST /api/users/toggle-status:`, err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/users/test-trigger — send test panic trigger to device
app.post("/api/users/test-trigger", async (req, res) => {
  const { id } = req.body;
  if (!isFirebaseReady()) return res.status(400).json({ error: "Firebase not connected." });
  try {
    const doc = await firestore.collection("users").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found." });
    if (doc.data()?.uninstalledAt) return res.status(400).json({ error: "User not available — app uninstalled." });
    if (!doc.data()?.fcmToken) return res.status(400).json({ error: "User not available — no device registered." });

    const sent = await sendFcmToUser(id, { action: "remote_trigger", sender: "Admin Test", source: "admin_test" });
    if (!sent) {
      // re-check for unregistered
      const fresh = await firestore.collection("users").doc(id).get();
      if (fresh.data()?.uninstalledAt) return res.status(400).json({ error: "Device unreachable — app uninstalled." });
      return res.status(500).json({ error: "FCM send failed." });
    }
    await firestore.collection("users").doc(id).update({ alarmActive: true });
    await addFeedEntry(`Test panic trigger sent to ${id}`, "sync");
    res.json({ success: true });
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] POST /api/users/test-trigger:`, err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/users/stop-alarm — remotely stop siren/alarm on a device
app.post("/api/users/stop-alarm", async (req, res) => {
  const { id } = req.body;
  if (!isFirebaseReady()) return res.status(400).json({ error: "Firebase not connected." });
  try {
    const doc = await firestore.collection("users").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found." });
    if (doc.data()?.uninstalledAt) return res.status(400).json({ error: "Device has been uninstalled." });
    if (!doc.data()?.fcmToken) return res.status(400).json({ error: "No device registered." });

    const sent = await sendFcmToUser(id, { action: "stop_alarm" });
    if (!sent) return res.status(500).json({ error: "FCM send failed." });

    await firestore.collection("users").doc(id).update({ alarmActive: false });
    await addFeedEntry(`Alarm stopped remotely for device ${id}`, "sync");
    res.json({ success: true });
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] POST /api/users/stop-alarm:`, err);
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/users/delete — permanently remove a user account
app.delete("/api/users/delete", async (req, res) => {
  const { id } = req.body;
  if (!isFirebaseReady()) {
    const idx = memDb.users.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ error: "User not found." });
    memDb.users.splice(idx, 1);
    return res.json({ success: true });
  }
  try {
    const doc = await firestore.collection("users").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found." });
    // Delete user doc
    await firestore.collection("users").doc(id).delete();
    // Clean up related data
    const events = await firestore.collection("events").where("userId", "==", id).get();
    const batch = firestore.batch();
    events.docs.forEach(e => batch.delete(e.ref));
    await batch.commit();
    await addFeedEntry(`User ${id} account permanently deleted`, "key_rotation");
    res.json({ success: true });
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] DELETE /api/users/delete:`, err);
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
    console.error(`[ERROR] [${new Date().toISOString()}] POST /api/broadcasts:`, err);
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
    if (updates.forceUpdate !== undefined) mapped.forceUpdate = updates.forceUpdate;
    if (updates.minRequiredVersion !== undefined) mapped.minRequiredVersion = updates.minRequiredVersion;
    if (updates.updateMessage !== undefined) mapped.updateMessage = updates.updateMessage;
    if (updates.updateUrl !== undefined) mapped.updateUrl = updates.updateUrl;
        mapped.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await firestore.collection("policies").doc("global").set(mapped, { merge: true });
        // Also update Remote Config so devices pick it up even without FCM
        try {
          const rc = admin.remoteConfig();
          const template = await rc.getTemplate();
          if (updates.maintenanceMode !== undefined) {
            template.parameters["maintenance_mode"] = { defaultValue: { value: String(updates.maintenanceMode) } };
          }
          if (updates.forceUpdate !== undefined) {
            template.parameters["force_update"] = { defaultValue: { value: String(updates.forceUpdate) } };
          }
          if (updates.minRequiredVersion !== undefined) {
            template.parameters["min_required_version"] = { defaultValue: { value: String(updates.minRequiredVersion) } };
          }
          if (updates.updateMessage !== undefined) {
            template.parameters["update_message"] = { defaultValue: { value: String(updates.updateMessage) } };
          }
          if (updates.updateUrl !== undefined) {
            template.parameters["update_url"] = { defaultValue: { value: String(updates.updateUrl) } };
          }
          if (updates.panicTriggerKeyword !== undefined) {
            template.parameters["trigger_keyword"] = { defaultValue: { value: String(updates.panicTriggerKeyword) } };
          }
          template.parameters["maintenance_mode_maintenance_message"] = {
            defaultValue: { value: updates.maintenanceSplashMessage ?? "" }
          };
          await rc.publishTemplate(template);
        } catch (rcErr) {
          console.warn("Remote Config update failed (may need IAM permissions):", rcErr);
        }
        // Also write policy fields to each user's doc so the app can read without Firestore rules
        try {
          const userSnap = await firestore.collection("users").get();
          for (const userDoc of userSnap.docs) {
            const userPolicyFields: Record<string, any> = {};
            if (updates.panicTriggerKeyword !== undefined) userPolicyFields.panicTriggerKeyword = updates.panicTriggerKeyword;
            if (updates.maintenanceMode !== undefined) userPolicyFields.maintenanceMode = updates.maintenanceMode;
            if (updates.maintenanceSplashMessage !== undefined) userPolicyFields.maintenanceMessage = updates.maintenanceSplashMessage;
            if (updates.forceUpdate !== undefined) userPolicyFields.forceUpdate = updates.forceUpdate;
            if (updates.minRequiredVersion !== undefined) userPolicyFields.minRequiredVersion = updates.minRequiredVersion;
            if (updates.updateMessage !== undefined) userPolicyFields.updateMessage = updates.updateMessage;
            if (updates.updateUrl !== undefined) userPolicyFields.updateUrl = updates.updateUrl;
            if (updates.announcementBody !== undefined) userPolicyFields.globalAnnouncement = updates.announcementBody;
            if (updates.announcementPriority !== undefined) userPolicyFields.announcementSeverity = updates.announcementPriority.toLowerCase();
            if (Object.keys(userPolicyFields).length > 0) {
              userPolicyFields.policyUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
              try { await userDoc.ref.update(userPolicyFields); } catch (e) { console.warn("Failed to update user doc", userDoc.id, e); }
            }
            const token = userDoc.data().fcmToken;
            if (token) {
              try { await sendFcmToToken(userDoc, { action: "update_policy" }); } catch {}
            }
          }
        } catch (userErr) {
          console.warn("Failed to update user docs (non-fatal):", userErr);
        }
        await addFeedEntry("Security policies updated fleet-wide", "key_rotation");
        res.json({ success: true });
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] POST /api/configs:`, err);
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
    console.error(`[ERROR] [${new Date().toISOString()}] POST /api/admins:`, err);
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
        panicTriggerKeyword: p.panicTriggerKeyword || "Where are you", maintenanceMode: p.maintenanceMode || false,
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
    console.error(`[ERROR] [${new Date().toISOString()}] POST /api/audit:`, error);
    const backupReport = getLocalHeuristicReport(prompt);
    res.json({ report: backupReport });
  }
});

// ---------------------------------------------------------------------------
// POST /api/device/command — send FCM command to a device
// ---------------------------------------------------------------------------
app.post("/api/device/command", async (req, res) => {
  const { userId, command } = req.body;
  if (!userId || !command) return res.status(400).json({ error: "userId and command required." });
  if (!isFirebaseReady()) return res.status(400).json({ error: "Firebase not connected." });
  try {
    const doc = await firestore.collection("users").doc(userId).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found." });
    if (doc.data()?.uninstalledAt) return res.status(400).json({ error: "Device has been uninstalled." });
    const token = doc.data()?.fcmToken;
    if (!token) return res.status(400).json({ error: "No device registered." });

    const fcmData: Record<string, string> = { command };
    if (command === "disarm") {
      fcmData.active = "false";
    } else if (command === "locate") {
      fcmData.command = "locate";
    } else if (command === "siren") {
      fcmData.command = "siren";
    }

    const sent = await sendFcmToUser(userId, fcmData);
    if (!sent) return res.status(500).json({ error: "FCM send failed — device may be offline." });

    await addFeedEntry(`Command "${command}" sent to device ${userId}`, "sync");
    res.json({ success: true });
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] POST /api/device/command:`, err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/emergencies — fetch emergency events from Firestore
app.get("/api/emergencies", async (req, res) => {
  if (!isFirebaseReady()) return res.json({ emergencies: [] });
  try {
    const snap = await firestore.collection("emergencies")
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();
    const emergencies = snap.docs.map(d => {
      const dd = d.data();
      const ts = dd.timestamp?.toMillis?.() || dd.timestamp || Date.now();
      return {
        id: d.id,
        type: dd.type || "emergency",
        message: dd.message || "",
        latitude: dd.latitude || 0,
        longitude: dd.longitude || 0,
        timestamp: ts,
        status: dd.status || "active"
      };
    });
    res.json({ emergencies });
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] GET /api/emergencies:`, err);
    res.json({ emergencies: [] });
  }
});

// ---------------------------------------------------------------------------
// Proximity Alert Engine — dispatch + accept + smart escalation
// ---------------------------------------------------------------------------

// Track which emergency IDs have already been dispatched for proximity alerts
const processedEmergencies = new Set<string>();

// Haversine distance (km) between two lat/lng points
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Dispatch proximity alerts to users within `radiusKm` of the emergency
async function dispatchProximityAlert(
  emergencyId: string,
  emergencyLat: number,
  emergencyLng: number,
  radiusKm: number,
  victimName: string,
  victimDeviceId: string,
  message: string
): Promise<number> {
  if (!isFirebaseReady()) return 0;
  try {
    const userSnap = await firestore.collection("users").get();
    const fcmData: Record<string, string> = {
      command: "nearby_emergency",
      emergencyId,
      victimName,
      latitude: String(emergencyLat),
      longitude: String(emergencyLng),
      victimDeviceId,
      message
    };
    let notifiedCount = 0;
    const notifiedDeviceIds: string[] = [];
    const updatedAt = Date.now();

    for (const userDoc of userSnap.docs) {
      const d = userDoc.data();
      const deviceId = userDoc.id;
      // Skip the victim device itself
      if (deviceId === victimDeviceId) continue;
      // Skip if no FCM token
      if (!d.fcmToken) continue;
      // Skip already notified in previous escalation rounds
      const alreadyNotified = d.notifiedEmergencies?.[emergencyId] != null;
      if (alreadyNotified) continue;

      const lat = d.lastLatitude;
      const lng = d.lastLongitude;
      if (lat == null || lng == null) continue;

      const dist = haversineKm(emergencyLat, emergencyLng, lat, lng);
      if (dist > radiusKm) continue;

      const payload = { ...fcmData, distance: dist.toFixed(1) };
      const sent = await sendFcmToToken(userDoc, payload);
      if (sent) {
        notifiedCount++;
        notifiedDeviceIds.push(deviceId);
        console.log(`[PROXIMITY] Notified ${deviceId} (${dist.toFixed(1)}km) for emergency ${emergencyId}`);
      }
    }

    // Update the emergency doc with notified devices
    if (notifiedDeviceIds.length > 0) {
      const notifiedMap: Record<string, number> = {};
      for (const id of notifiedDeviceIds) {
        notifiedMap[id] = updatedAt;
      }
      await firestore.collection("emergencies").doc(emergencyId).set({
        proximityDispatched: true,
        dispatchRadius: radiusKm,
        lastEscalation: admin.firestore.FieldValue.serverTimestamp(),
        notifiedDevices: admin.firestore.FieldValue.arrayUnion(...notifiedDeviceIds),
      }, { merge: true });
    }

    return notifiedCount;
  } catch (err) {
    console.error(`[PROXIMITY] dispatch error:`, err);
    return 0;
  }
}

// Check for unprocessed emergencies and handle escalation
async function checkProximityAlerts() {
  if (!isFirebaseReady()) return;
  try {
    const snap = await firestore.collection("emergencies")
      .where("status", "==", "active")
      .get();

    const now = Date.now();
    const docs = snap.docs.sort((a, b) => {
      const ta = a.data().timestamp?.toMillis?.() || a.data().timestamp || 0;
      const tb = b.data().timestamp?.toMillis?.() || b.data().timestamp || 0;
      return tb - ta;
    });

    for (const doc of docs) {
      const d = doc.data();
      const emergencyId = doc.id;
      const ts = d.timestamp?.toMillis?.() || d.timestamp || now;
      const victimDeviceId = d.deviceId || "";
      const victimName = d.message || "Someone";
      const emergencyLat = d.latitude || 0;
      const emergencyLng = d.longitude || 0;
      const responders = d.responders || [];
      const lastEscalation = d.lastEscalation?.toMillis?.() || d.lastEscalation || 0;
      const currentRadius = d.dispatchRadius || 0;

      // If there's already a responder, skip
      if (responders.length > 0) continue;

      // If this is a new emergency (not yet processed) — dispatch at 5km
      if (!processedEmergencies.has(emergencyId) && emergencyLat && emergencyLng) {
        processedEmergencies.add(emergencyId);
        const count = await dispatchProximityAlert(
          emergencyId, emergencyLat, emergencyLng, 5, victimName, victimDeviceId, d.message || ""
        );
        console.log(`[PROXIMITY] Initial dispatch for ${emergencyId}: ${count} devices notified within 5km`);
        continue;
      }

      // Escalation: every 2 min widen radius — 5 → 10 → 20 → broadcast
      if (!emergencyLat || !emergencyLng) continue;
      const elapsed = now - ts;
      const sinceLastEsc = now - lastEscalation;

      if (elapsed > 600000 && sinceLastEsc > 120000) {
        // 10min+ — broadcast to ALL active
        const count = await dispatchProximityAlert(
          emergencyId, emergencyLat, emergencyLng, 99999, victimName, victimDeviceId, d.message || ""
        );
        console.log(`[PROXIMITY] Broadcast ALL for ${emergencyId}: ${count} devices notified`);
      } else if (elapsed > 300000 && sinceLastEsc > 120000 && currentRadius < 20) {
        // 5min+ — widen to 20km
        const count = await dispatchProximityAlert(
          emergencyId, emergencyLat, emergencyLng, 20, victimName, victimDeviceId, d.message || ""
        );
        console.log(`[PROXIMITY] Escalated ${emergencyId} to 20km: ${count} devices notified`);
      } else if (elapsed > 120000 && sinceLastEsc > 120000 && currentRadius < 10) {
        // 2min+ — widen to 10km
        const count = await dispatchProximityAlert(
          emergencyId, emergencyLat, emergencyLng, 10, victimName, victimDeviceId, d.message || ""
        );
        console.log(`[PROXIMITY] Escalated ${emergencyId} to 10km: ${count} devices notified`);
      }
    }
  } catch (err) {
    console.error(`[PROXIMITY] check error:`, err);
  }
}

// Run proximity check every 30 seconds
setInterval(checkProximityAlerts, 30000);

// POST /api/emergencies/nearby — manually trigger proximity dispatch
app.post("/api/emergencies/nearby", async (req, res) => {
  const { emergencyId } = req.body;
  if (!emergencyId) return res.status(400).json({ error: "emergencyId required" });
  if (!isFirebaseReady()) return res.status(400).json({ error: "Firebase not connected" });
  try {
    const doc = await firestore.collection("emergencies").doc(emergencyId).get();
    if (!doc.exists) return res.status(404).json({ error: "Emergency not found" });
    const d = doc.data()!;
    const count = await dispatchProximityAlert(
      emergencyId, d.latitude || 0, d.longitude || 0, 5,
      d.message || "Someone", d.deviceId || "", d.message || ""
    );
    res.json({ success: true, notified: count });
  } catch (err) {
    console.error(`[ERROR] POST /api/emergencies/nearby:`, err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/emergencies/accept — mark a device as responding
app.post("/api/emergencies/accept", async (req, res) => {
  const { emergencyId, deviceId, displayName } = req.body;
  if (!emergencyId || !deviceId) return res.status(400).json({ error: "emergencyId and deviceId required" });
  if (!isFirebaseReady()) return res.status(400).json({ error: "Firebase not connected" });
  try {
    const doc = await firestore.collection("emergencies").doc(emergencyId).get();
    if (!doc.exists) return res.status(404).json({ error: "Emergency not found" });
    const d = doc.data()!;
    const responders = d.responders || [];
    // Don't add duplicate
    if (responders.some((r: any) => r.deviceId === deviceId)) {
      return res.json({ success: true, message: "Already a responder" });
    }
    responders.push({
      deviceId,
      displayName: displayName || "Unknown",
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "responding"
    });
    await doc.ref.update({ responders });
    console.log(`[PROXIMITY] Responder ${displayName} (${deviceId}) accepted emergency ${emergencyId}`);
    await addFeedEntry(`Responder ${displayName} accepted emergency ${emergencyId}`, "sync");
    res.json({ success: true });
  } catch (err) {
    console.error(`[ERROR] POST /api/emergencies/accept:`, err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/emergencies/responders/:id — fetch responders for an emergency
app.get("/api/emergencies/responders/:id", async (req, res) => {
  const { id } = req.params;
  if (!isFirebaseReady()) return res.json({ responders: [] });
  try {
    const doc = await firestore.collection("emergencies").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Emergency not found" });
    res.json({ responders: doc.data()?.responders || [] });
  } catch (err) {
    console.error(`[ERROR] GET /api/emergencies/responders/${id}:`, err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// Vault — sensitive user data behind env-var PIN
// ---------------------------------------------------------------------------
const VAULT_PIN = process.env.VAULT_PIN || "0000";

app.post("/api/vault/verify", (req, res) => {
  const { pin } = req.body;
  if (pin === VAULT_PIN) {
    return res.json({ verified: true });
  }
  return res.status(401).json({ verified: false, error: "Invalid vault PIN." });
});

app.get("/api/vault/data", async (req, res) => {
  if (!isFirebaseReady()) {
    return res.json({
      users: memDb.users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        deviceModel: u.deviceModel,
        osVersion: u.osVersion,
        protectionActive: u.protectionActive,
        lastActive: u.lastActive,
        location: "N/A",
        pinHash: "N/A",
        pinSalt: "N/A",
        savedPasswords: []
      }))
    });
  }
  try {
    const userSnap = await firestore.collection("users").get();
    const users = userSnap.docs.map(d => {
      const dd = d.data();
      const ts = dd.lastActive?.toMillis?.() || dd.lastActive || 0;
      return {
        id: d.id,
        email: dd.email || "N/A",
        name: dd.displayName || dd.email || "Unknown",
        deviceModel: dd.deviceModel || dd.deviceInfo?.model || "Unknown",
        osVersion: dd.osVersion || dd.deviceInfo?.osVersion || "Unknown",
        protectionActive: dd.settings?.isProtectionActive ?? dd.shieldActive ?? false,
        lastActive: ts ? new Date(ts).toLocaleString() : "Never",
        pinHash: dd.pinHash || "Not set",
        pinSalt: dd.pinSalt || "Not set",
        savedPasswords: dd.savedPasswords || []
      };
    });
    res.json({ users });
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] GET /api/vault/data:`, err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// Device Logs API — reads from Firestore debugLogs collection
// ---------------------------------------------------------------------------
app.get("/api/logs", async (req, res) => {
  const tag = "GET /api/logs";
  console.log(`[${new Date().toISOString()}] ${tag}`);
  if (!isFirebaseReady()) { return res.json({ logs: [] }); }
  try {
    const snap = await firestore
      .collection("debugLogs")
      .orderBy("timestamp", "desc")
      .limit(500)
      .get();
    const logs = snap.docs.map((d) => {
      const dd = d.data();
      return {
        id: d.id,
        level: dd.level || "INFO",
        tag: dd.tag || "",
        message: dd.message || "",
        stacktrace: dd.stacktrace || "",
        timestamp: dd.timestamp || 0,
        deviceName: dd.deviceName || "",
        deviceId: dd.deviceId || "",
        appVersion: dd.appVersion || "",
      };
    });
    res.json({ logs });
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${tag}:`, err);
    res.status(500).json({ error: String(err) });
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
