package com.securphone.app.utils

object Constants {
    const val GOOGLE_WEB_CLIENT_ID = "28723391523-69f5f3rvurs65eiphg6goej2lh6a3pol.apps.googleusercontent.com"
    const val PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.securphone.app"
    const val CURRENT_VERSION = "1.0.0"

    const val DEFAULT_TRIGGER_KEYWORD = "Where are you"
    const val TRIGGER_COOLDOWN_MS = 60000L
    const val MAX_PIN_ATTEMPTS = 5
    const val VOLUME_WARNING_DURATION_MS = 3000L
    const val VOLUME_GUARD_INTERVAL_MS = 500L
    const val SERVICE_RESTART_DELAY_MS = 2000L
    const val MIN_SPLASH_DURATION_MS = 2500L

    const val PREFS_NAME = "securphone_prefs"
    const val KEY_PROTECTION_ACTIVE = "protection_active"
    const val KEY_SETUP_COMPLETE = "setup_complete"
    const val KEY_ONBOARDING_SEEN = "onboarding_seen"
    const val KEY_TRIGGER_KEYWORD = "trigger_keyword"
    const val KEY_ALARM_VOLUME = "alarm_volume"
    const val KEY_SIREN_TYPE = "siren_type"
    const val KEY_AUTO_START = "auto_start"

    const val KEY_MAINTENANCE_MODE = "maintenance_mode_enabled"
    const val KEY_MAINTENANCE_MESSAGE = "maintenance_message"
    const val KEY_GLOBAL_ANNOUNCEMENT = "global_announcement"
    const val KEY_ANNOUNCEMENT_SEVERITY = "announcement_severity"
    const val KEY_FORCE_UPDATE = "force_update_enabled"
    const val KEY_MIN_REQUIRED_VERSION = "min_required_version"
    const val KEY_UPDATE_MESSAGE = "update_message_pref"
    const val KEY_UPDATE_URL = "update_url"

    const val KEY_POCKET_SHIELD = "pocket_shield"
    const val KEY_CHARGER_UNPLUG = "charger_unplug"
    const val KEY_SIM_ALERT = "sim_alert"
    const val KEY_USB_BLOCK = "usb_block"

    const val KEY_SAFE_LOCATION_ENABLED = "safe_location_enabled"
    const val KEY_SAFE_ZONE_LAT = "safe_zone_lat"
    const val KEY_SAFE_ZONE_LNG = "safe_zone_lng"
    const val KEY_SAFE_ZONE_RADIUS = "safe_zone_radius"
    const val SAFE_ZONE_DEFAULT_RADIUS = 50.0

    const val KEY_EMERGENCY_CONTACTS = "emergency_contacts"

    const val CHANNEL_PROTECTION = "sp_protection_channel"
    const val CHANNEL_ALERTS = "sp_alerts_channel"
    const val CHANNEL_GENERAL = "sp_general_channel"

    const val NOTIF_ID_PROTECTION = 1001
    const val NOTIF_ID_TRIGGER = 1002
    const val NOTIF_ID_GENERAL = 1003

    const val RC_GOOGLE_SIGN_IN = 9001
    const val RC_OVERLAY_PERMISSION = 9002
    const val RC_LOCATION_PERMISSION = 9003
    const val RC_BACKGROUND_LOCATION = 9004
    const val RC_DEVICE_ADMIN = 9005
    const val RC_CALL_PERMISSION = 9006

    const val COLLECTION_USERS = "users"
    const val COLLECTION_EVENTS = "events"
    const val COLLECTION_SESSIONS = "sessions"
    const val COLLECTION_APP_CONFIG = "appConfig"
    const val COLLECTION_ADMINS = "admins"
    const val COLLECTION_BROADCASTS = "broadcasts"
    const val COLLECTION_ANALYTICS = "analytics"
    const val COLLECTION_AUDIT_LOGS = "audit_logs"
    const val COLLECTION_POLICIES = "policies"
    const val COLLECTION_METRICS = "metrics"

    const val FIELD_EMAIL = "email"
    const val FIELD_DISPLAY_NAME = "displayName"
    const val FIELD_PHONE = "phone"
    const val FIELD_PIN_HASH = "pinHash"
    const val FIELD_PIN_SALT = "pinSalt"
    const val FIELD_MEMBER_STATUS = "memberStatus"
    const val FIELD_CLEARANCE_LEVEL = "clearanceLevel"
    const val FIELD_IS_BLOCKED = "isBlocked"
    const val FIELD_IS_PROTECTION_ACTIVE = "isProtectionActive"
    const val FIELD_TRIGGER_KEYWORD = "triggerKeyword"
    const val FIELD_FCM_TOKEN = "fcmToken"
    const val FIELD_LAST_ACTIVE = "lastActive"
    const val FIELD_LAST_LOGIN = "lastLogin"
    const val FIELD_LAST_LATITUDE = "lastLatitude"
    const val FIELD_LAST_LONGITUDE = "lastLongitude"
    const val FIELD_CREATED_AT = "createdAt"
    const val FIELD_APP_VERSION = "appVersion"
    const val FIELD_DEVICE_ALIAS = "deviceAlias"
    const val FIELD_OS_VERSION = "osVersion"
    const val FIELD_DEVICE_MODEL = "deviceModel"
    const val FIELD_FINGERPRINT_REGISTERED = "fingerprintRegistered"
    const val FIELD_SHIELD_ACTIVE = "shieldActive"
    const val FIELD_CENTRAL_SYNC = "centralSync"
    const val FIELD_LAST_SYNC = "lastSyncTimestamp"
    const val FIELD_ALARM_ACTIVE = "alarmActive"

    const val RC_KEY_LATEST_VERSION = "latest_version"
    const val RC_KEY_MIN_VERSION = "min_required_version"
    const val RC_KEY_FORCE_UPDATE = "force_update"
    const val RC_KEY_UPDATE_MESSAGE = "update_message"
    const val RC_KEY_UPDATE_URL = "update_url"
    const val RC_KEY_MAINTENANCE = "maintenance_mode"
    const val RC_KEY_GLOBAL_MESSAGE = "global_message"
    const val RC_KEY_SHOW_GLOBAL_MESSAGE = "show_global_message"

    val SMS_PACKAGES = listOf(
        "com.google.android.apps.messaging",
        "com.samsung.android.messaging",
        "com.android.mms",
        "com.textra",
        "com.handcent.nextsms",
        "org.thoughtcrime.securesms",
        "com.verizon.messaging.vzmsgs",
        "com.att.messages"
    )

    val WHATSAPP_PACKAGES = listOf(
        "com.whatsapp",
        "com.whatsapp.w4b"
    )

    const val EVENT_TRIGGER_ACTIVATED = "trigger_activated"
    const val EVENT_ALARM_STARTED = "alarm_started"
    const val EVENT_LOCATION_SENT = "location_sent"
    const val EVENT_PIN_CORRECT = "pin_correct"
    const val EVENT_PIN_FAILED = "pin_failed"
    const val EVENT_PIN_LOCKOUT = "pin_failed_lockout"
    const val EVENT_ADMIN_DISABLED = "admin_disabled"
    const val EVENT_MANUAL_TRIGGER = "manual_trigger"
    const val EVENT_EMERGENCY_TRIGGERED = "emergency_triggered"
    const val EVENT_DEVICE_REGISTERED = "device_registered"
    const val EVENT_SHIELD_ACTIVATED = "shield_activated"
    const val EVENT_SHIELD_DEACTIVATED = "shield_deactivated"
    const val EVENT_SYNC_COMPLETED = "sync_completed"
    const val EVENT_KILL_CONNECTION = "kill_connection"
    const val EVENT_KEY_SYNC = "key_sync"
    const val EVENT_BROADCAST_SENT = "broadcast_sent"
    const val EVENT_ADMIN_LOGIN = "admin_login"
    const val EVENT_POLICY_UPDATED = "policy_updated"

    const val SEVERITY_INFO = "info"
    const val SEVERITY_WARNING = "warning"
    const val SEVERITY_CRITICAL = "critical"

    const val AUDIENCE_GLOBAL = "global"
    const val AUDIENCE_SECURITY_LEVEL_3 = "security_level_3"
    const val AUDIENCE_PREMIUM = "premium"
    const val AUDIENCE_LEGACY_OS = "legacy_os"

    const val SIREN_HIGH_FREQUENCY = "high_frequency"
    const val SIREN_ACOUSTIC_PULSE = "acoustic_pulse"
    const val SIREN_SILENT_BEACON = "silent_beacon"

    const val CLEARANCE_BASIC = 0
    const val CLEARANCE_ELEVATED = 1
    const val CLEARANCE_LEVEL_3 = 3
    const val CLEARANCE_LEVEL_5 = 5

    const val ADMIN_ACTION_FORCE_UPDATE = "force_update"
    const val ADMIN_ACTION_BLOCK_USER = "block_user"
    const val ADMIN_ACTION_REMOTE_TRIGGER = "remote_trigger"
    const val ADMIN_ACTION_LOCK = "LOCK"
    const val ADMIN_ACTION_KILL_CONNECTION = "kill_connection"
    const val ADMIN_ACTION_KEY_SYNC = "key_sync"
    const val ADMIN_ACTION_UPDATE_POLICY = "update_policy"
    const val ADMIN_ACTION_TOGGLE_SHIELD = "toggle_shield"
    const val ADMIN_ACTION_CLEARANCE_UPDATE = "clearance_update"
    const val ADMIN_ACTION_SEND_BROADCAST = "send_broadcast"
    const val ADMIN_ACTION_STOP_ALARM = "stop_alarm"

    const val STATUS_FREE = "free"
    const val STATUS_PREMIUM = "premium"

    const val NAV_ONBOARDING = "goto_onboarding"
    const val NAV_LOGIN = "goto_login"
    const val NAV_SETUP = "goto_setup"
    const val NAV_MAIN = "goto_main"
    const val NAV_FORCE_UPDATE = "force_update"
    const val NAV_MAINTENANCE = "maintenance"

    const val ACTION_ALARM_SHAKE = "com.securphone.app.action.ALARM_SHAKE"
    const val ACTION_ALARM_STOPPED = "com.securphone.app.action.ALARM_STOPPED"
    const val ACTION_SILENCE_SIREN = "com.securphone.app.action.SILENCE_SIREN"

    const val ACTION_SHOW_FAKE_POWER_MENU = "com.securphone.app.action.SHOW_FAKE_POWER_MENU"
    const val ACTION_FAKE_POWER_OFF = "com.securphone.app.action.FAKE_POWER_OFF"
    const val ACTION_FAKE_POWER_RESUME = "com.securphone.app.action.FAKE_POWER_RESUME"
}
