package com.securphone.app.data.preferences

import android.content.Context
import android.content.SharedPreferences
import com.securphone.app.utils.Constants

object PreferencesManager {
    private const val PREFS_NAME = "securphone_prefs"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isProtectionActive(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_PROTECTION_ACTIVE, false)
    }

    fun setProtectionActive(context: Context, active: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_PROTECTION_ACTIVE, active).apply()
    }

    fun isSetupCompleted(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_SETUP_COMPLETE, false)
    }

    fun setSetupCompleted(context: Context, completed: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_SETUP_COMPLETE, completed).apply()
    }

    fun isOnboardingSeen(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_ONBOARDING_SEEN, false)
    }

    fun setOnboardingSeen(context: Context, seen: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_ONBOARDING_SEEN, seen).apply()
    }

    fun getTriggerKeyword(context: Context): String {
        return getPrefs(context).getString(Constants.KEY_TRIGGER_KEYWORD, Constants.DEFAULT_TRIGGER_KEYWORD) ?: Constants.DEFAULT_TRIGGER_KEYWORD
    }

    fun setTriggerKeyword(context: Context, keyword: String) {
        getPrefs(context).edit().putString(Constants.KEY_TRIGGER_KEYWORD, keyword).apply()
    }

    fun getPinHash(context: Context): String? {
        return getPrefs(context).getString("pin_hash", null)
    }

    fun setPinHash(context: Context, hash: String) {
        getPrefs(context).edit().putString("pin_hash", hash).apply()
    }

    fun getPinSalt(context: Context): String? {
        return getPrefs(context).getString("pin_salt", null)
    }

    fun setPinSalt(context: Context, salt: String) {
        getPrefs(context).edit().putString("pin_salt", salt).apply()
    }

    fun clearAll(context: Context) {
        val onboardingSeen = isOnboardingSeen(context)
        getPrefs(context).edit().clear().apply()
        if (onboardingSeen) {
            setOnboardingSeen(context, true)
        }
    }

    fun getSirenType(context: Context): String {
        return getPrefs(context).getString(Constants.KEY_SIREN_TYPE, Constants.SIREN_HIGH_FREQUENCY) ?: Constants.SIREN_HIGH_FREQUENCY
    }

    fun setSirenType(context: Context, type: String) {
        getPrefs(context).edit().putString(Constants.KEY_SIREN_TYPE, type).apply()
    }

    fun getAlarmVolume(context: Context): Int {
        return getPrefs(context).getInt(Constants.KEY_ALARM_VOLUME, 100)
    }

    fun setAlarmVolume(context: Context, volume: Int) {
        getPrefs(context).edit().putInt(Constants.KEY_ALARM_VOLUME, volume).apply()
    }

    fun getMaxPinAttempts(context: Context): Int {
        return getPrefs(context).getInt("max_pin_attempts", Constants.MAX_PIN_ATTEMPTS)
    }

    fun setMaxPinAttempts(context: Context, attempts: Int) {
        getPrefs(context).edit().putInt("max_pin_attempts", attempts).apply()
    }

    fun isPocketShieldEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_POCKET_SHIELD, true)
    }

    fun setPocketShieldEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_POCKET_SHIELD, enabled).apply()
    }

    fun isMaintenanceMode(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_MAINTENANCE_MODE, false)
    }

    fun setMaintenanceMode(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_MAINTENANCE_MODE, enabled).apply()
    }

    fun getMaintenanceMessage(context: Context): String {
        return getPrefs(context).getString(Constants.KEY_MAINTENANCE_MESSAGE, "") ?: ""
    }

    fun setMaintenanceMessage(context: Context, message: String) {
        getPrefs(context).edit().putString(Constants.KEY_MAINTENANCE_MESSAGE, message).apply()
    }

    fun getGlobalAnnouncement(context: Context): String {
        return getPrefs(context).getString(Constants.KEY_GLOBAL_ANNOUNCEMENT, "") ?: ""
    }

    fun setGlobalAnnouncement(context: Context, announcement: String) {
        getPrefs(context).edit().putString(Constants.KEY_GLOBAL_ANNOUNCEMENT, announcement).apply()
    }

    fun getAnnouncementSeverity(context: Context): String {
        return getPrefs(context).getString(Constants.KEY_ANNOUNCEMENT_SEVERITY, "info") ?: "info"
    }

    fun setAnnouncementSeverity(context: Context, severity: String) {
        getPrefs(context).edit().putString(Constants.KEY_ANNOUNCEMENT_SEVERITY, severity).apply()
    }

    fun isForceUpdateEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_FORCE_UPDATE, false)
    }

    fun setForceUpdateEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_FORCE_UPDATE, enabled).apply()
    }

    fun getMinRequiredVersion(context: Context): String {
        return getPrefs(context).getString(Constants.KEY_MIN_REQUIRED_VERSION, "1.0.0") ?: "1.0.0"
    }

    fun setMinRequiredVersion(context: Context, version: String) {
        getPrefs(context).edit().putString(Constants.KEY_MIN_REQUIRED_VERSION, version).apply()
    }

    fun getUpdateMessage(context: Context): String {
        return getPrefs(context).getString(Constants.KEY_UPDATE_MESSAGE, "") ?: ""
    }

    fun setUpdateMessage(context: Context, message: String) {
        getPrefs(context).edit().putString(Constants.KEY_UPDATE_MESSAGE, message).apply()
    }

    fun getUpdateUrl(context: Context): String {
        return getPrefs(context).getString(Constants.KEY_UPDATE_URL, "") ?: ""
    }

    fun setUpdateUrl(context: Context, url: String) {
        getPrefs(context).edit().putString(Constants.KEY_UPDATE_URL, url).apply()
    }

    fun isChargerUnplugEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_CHARGER_UNPLUG, false)
    }

    fun setChargerUnplugEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_CHARGER_UNPLUG, enabled).apply()
    }

    fun isSimAlertEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_SIM_ALERT, true)
    }

    fun setSimAlertEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_SIM_ALERT, enabled).apply()
    }

    fun isUsbBlockEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_USB_BLOCK, true)
    }

    fun setUsbBlockEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_USB_BLOCK, enabled).apply()
    }

    fun isSafeLocationEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(Constants.KEY_SAFE_LOCATION_ENABLED, false)
    }

    fun setSafeLocationEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(Constants.KEY_SAFE_LOCATION_ENABLED, enabled).apply()
    }

    fun getSafeZoneLat(context: Context): Double {
        return getPrefs(context).getFloat(Constants.KEY_SAFE_ZONE_LAT, 0f).toDouble()
    }

    fun setSafeZoneLat(context: Context, lat: Double) {
        getPrefs(context).edit().putFloat(Constants.KEY_SAFE_ZONE_LAT, lat.toFloat()).apply()
    }

    fun getSafeZoneLng(context: Context): Double {
        return getPrefs(context).getFloat(Constants.KEY_SAFE_ZONE_LNG, 0f).toDouble()
    }

    fun setSafeZoneLng(context: Context, lng: Double) {
        getPrefs(context).edit().putFloat(Constants.KEY_SAFE_ZONE_LNG, lng.toFloat()).apply()
    }

    fun getSafeZoneRadius(context: Context): Double {
        return getPrefs(context).getFloat(Constants.KEY_SAFE_ZONE_RADIUS, Constants.SAFE_ZONE_DEFAULT_RADIUS.toFloat()).toDouble()
    }

    fun setSafeZoneRadius(context: Context, radius: Double) {
        getPrefs(context).edit().putFloat(Constants.KEY_SAFE_ZONE_RADIUS, radius.toFloat()).apply()
    }

    fun getEmergencyContacts(context: Context): Set<String> {
        return getPrefs(context).getStringSet(Constants.KEY_EMERGENCY_CONTACTS, emptySet()) ?: emptySet()
    }

    fun setEmergencyContacts(context: Context, contacts: Set<String>) {
        getPrefs(context).edit().putStringSet(Constants.KEY_EMERGENCY_CONTACTS, contacts).apply()
    }
}
