package com.securphone.app.data.models

data class PolicyConfigModel(
    val panicTriggerKeyword: String = "ECLIPSE",
    val maxPinAttempts: Int = 5,
    val sirenType: String = "high_frequency",
    val enforceMaxVolume: Boolean = true,
    val maintenanceMode: Boolean = false,
    val maintenanceMessage: String = "",
    val maintenanceScheduledEnd: Long = 0,
    val forceUpdate: Boolean = false,
    val minRequiredVersion: String = "1.0.0",
    val updateMessage: String = "",
    val updateUrl: String = "",
    val globalAnnouncement: String = "",
    val announcementSeverity: String = "info",
    val updatedAt: Long = System.currentTimeMillis(),
    val updatedBy: String = ""
)
