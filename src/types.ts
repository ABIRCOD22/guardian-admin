/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Super Admin' | 'Analyst';
  lastLogin: string;
}

export type BroadcastStatus = 'Sent' | 'Scheduled' | 'Draft' | 'Failed';

export interface BroadcastNotification {
  id: string;
  title: string;
  body: string;
  targetAudience: string;
  actionUrl?: string;
  status: BroadcastStatus;
  timestamp: string;
  deliveryRate?: number; // e.g. 99.8 for 99.8%
  errorMessage?: string; // e.g. 'Gateway Timeout'
}

export type EventLogType = 'Trigger' | 'Alarm' | 'Access';
export type EventLogStatus = 'Investigating' | 'Resolved' | 'Logged';

export interface EventLog {
  id: string;
  timestamp: string;
  type: EventLogType;
  source: string;
  userEntity: string;
  details: string;
  location: string;
  status: EventLogStatus;
  payload: Record<string, any>;
  actionTrail: Array<{
    text: string;
    timestamp: string;
    icon: string; // e.g. 'radio_button_checked' or 'radio_button_unchecked'
    color: string; // e.g. 'error' or 'primary'
  }>;
}

export interface SecurityConfig {
  require2FA: boolean;
  sessionTimeout: number; // in mins
  maxLoginAttempts: number;
  projectId: string;
  lastSync: string;
  apiRequests24h: number;
  maintenanceMode: boolean;
  maintenanceSplashMessage: string;
  maintenanceStartTime: string;
  maintenanceEndTime: string;
  announcementEnabled: boolean;
  announcementTitle: string;
  announcementBody: string;
  announcementPriority: 'Info' | 'Warning' | 'Critical';
  panicTriggerKeyword: string;
  maxPinAttempts: number;
  alarmAudioConfig: string;
  defaultVolumeOverride: number; // 0 to 100
  forceUpdate: boolean;
  minRequiredVersion: string;
  updateMessage: string;
  updateUrl: string;
}

export interface SecurityUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  status: 'Active' | 'Inactive' | 'Blocked';
  deviceModel: string;
  lastActive: string;
  protectionActive: boolean;
  isPremium: boolean;
  deviceId: string;
  osVersion: string;
  lastSync: string;
  alarmActive?: boolean;
  lastLatitude?: number;
  lastLongitude?: number;
}

export interface LiveFeedItem {
  id: string;
  type: 'sync' | 'block' | 'key_rotation';
  text: string;
  timestamp: string;
}
