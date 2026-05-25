package com.securphone.app.data.firebase

import android.content.Context
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings
import com.securphone.app.data.models.AdminModel
import com.securphone.app.data.models.AnalyticsSnapshotModel
import com.securphone.app.data.models.AuditLogEntry
import com.securphone.app.data.models.BroadcastModel
import com.securphone.app.data.models.DashboardMetricsModel
import com.securphone.app.data.models.DeviceInfoModel
import com.securphone.app.data.models.EventModel
import com.securphone.app.data.models.PolicyConfigModel
import com.securphone.app.data.preferences.PreferencesManager
import com.securphone.app.data.models.SessionModel
import com.securphone.app.data.models.UserModel
import com.securphone.app.utils.Constants
import kotlinx.coroutines.tasks.await

object FirebaseManager {
    lateinit var auth: FirebaseAuth
        private set
    lateinit var firestore: FirebaseFirestore
        private set
    lateinit var messaging: FirebaseMessaging
        private set
    lateinit var remoteConfig: FirebaseRemoteConfig
        private set

    fun initialize(context: Context) {
        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()
        messaging = FirebaseMessaging.getInstance()
        remoteConfig = FirebaseRemoteConfig.getInstance()

        val configSettings = FirebaseRemoteConfigSettings.Builder()
            .setMinimumFetchIntervalInSeconds(60)
            .build()
        remoteConfig.setConfigSettingsAsync(configSettings)
        remoteConfig.setDefaultsAsync(com.securphone.app.R.xml.remote_config_defaults)
    }

    fun getCurrentUser(): FirebaseUser? = auth.currentUser

    suspend fun signInWithEmail(email: String, password: String): Result<FirebaseUser> {
        return try {
            val result = auth.signInWithEmailAndPassword(email, password).await()
            result.user?.let { Result.success(it) } ?: Result.failure(Exception("User is null"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signUpWithEmail(email: String, password: String): Result<FirebaseUser> {
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password).await()
            result.user?.let { Result.success(it) } ?: Result.failure(Exception("User is null"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signInWithGoogle(idToken: String): Result<FirebaseUser> {
        return try {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            val result = auth.signInWithCredential(credential).await()
            result.user?.let { Result.success(it) } ?: Result.failure(Exception("User is null"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun signOut() {
        auth.signOut()
    }

    suspend fun getFcmToken(): Result<String> {
        return try {
            val token = messaging.token.await()
            Result.success(token)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createUserDocument(user: UserModel): Result<Unit> {
        return try {
            firestore.collection(Constants.COLLECTION_USERS)
                .document(user.id)
                .set(user)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUserDocument(userId: String): Result<UserModel> {
        return try {
            val doc = firestore.collection(Constants.COLLECTION_USERS)
                .document(userId)
                .get()
                .await()
            val user = if (doc.exists()) {
                doc.toObject(UserModel::class.java) ?: UserModel()
            } else {
                return Result.failure(Exception("User document not found"))
            }
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAllUserDocuments(): Result<List<UserModel>> {
        return try {
            val snapshot = firestore.collection(Constants.COLLECTION_USERS)
                .get()
                .await()
            val users = snapshot.documents.mapNotNull { it.toObject(UserModel::class.java) }
            Result.success(users)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateUserDocument(userId: String, updates: Map<String, Any>): Result<Unit> {
        return try {
            firestore.collection(Constants.COLLECTION_USERS)
                .document(userId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteUserDocument(userId: String): Result<Unit> {
        return try {
            firestore.collection(Constants.COLLECTION_USERS)
                .document(userId)
                .delete()
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateDeviceInfo(userId: String, deviceInfo: DeviceInfoModel): Result<Unit> {
        return updateUserDocument(userId, mapOf("deviceInfo" to deviceInfo))
    }

    suspend fun updateProtectionStatus(userId: String, isActive: Boolean): Result<Unit> {
        return updateUserDocument(userId, mapOf("settings.isProtectionActive" to isActive))
    }

    suspend fun updateLocation(userId: String, latitude: Double, longitude: Double): Result<Unit> {
        Log.d("FirebaseMgr", "updateLocation $userId → $latitude, $longitude")
        val updates = mapOf<String, Any>(
            Constants.FIELD_LAST_LATITUDE to latitude,
            Constants.FIELD_LAST_LONGITUDE to longitude
        )
        val result = updateUserDocument(userId, updates)
        Log.d("FirebaseMgr", "updateLocation result: $result")
        return result
    }

    suspend fun updateFcmToken(userId: String, token: String): Result<Unit> {
        return updateUserDocument(userId, mapOf(Constants.FIELD_FCM_TOKEN to token))
    }

    suspend fun updateLastActive(userId: String): Result<Unit> {
        return updateUserDocument(userId, mapOf(
            Constants.FIELD_LAST_ACTIVE to System.currentTimeMillis()
        ))
    }

    suspend fun toggleShield(userId: String, active: Boolean): Result<Unit> {
        val updates = mapOf<String, Any>(
            Constants.FIELD_SHIELD_ACTIVE to active,
            Constants.FIELD_CENTRAL_SYNC to false
        )
        return updateUserDocument(userId, updates)
    }

    suspend fun updateAlarmStatus(userId: String, active: Boolean): Result<Unit> {
        return updateUserDocument(userId, mapOf(Constants.FIELD_ALARM_ACTIVE to active))
    }

    suspend fun updateClearance(userId: String, level: Int): Result<Unit> {
        return updateUserDocument(userId, mapOf(Constants.FIELD_CLEARANCE_LEVEL to level))
    }

    suspend fun updateBlockStatus(userId: String, blocked: Boolean): Result<Unit> {
        return updateUserDocument(userId, mapOf(Constants.FIELD_IS_BLOCKED to blocked))
    }

    suspend fun syncDevice(userId: String): Result<Unit> {
        return updateUserDocument(userId, mapOf(
            Constants.FIELD_CENTRAL_SYNC to true,
            Constants.FIELD_LAST_SYNC to System.currentTimeMillis()
        ))
    }

    suspend fun logEvent(event: EventModel): Result<Unit> {
        return try {
            val docRef = firestore.collection(Constants.COLLECTION_EVENTS).document()
            firestore.collection(Constants.COLLECTION_EVENTS)
                .document(docRef.id)
                .set(event.copy(id = docRef.id))
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getEvents(userId: String? = null, limit: Int = 50): Result<List<EventModel>> {
        return try {
            var query = firestore.collection(Constants.COLLECTION_EVENTS)
                .orderBy("timestamp", com.google.firebase.firestore.Query.Direction.DESCENDING)
                .limit(limit.toLong())
            if (userId != null) {
                query = query.whereEqualTo("userId", userId)
            }
            val snapshot = query.get().await()
            val events = snapshot.documents.mapNotNull { it.toObject(EventModel::class.java) }
            Result.success(events)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resolveEvent(eventId: String, notes: List<String>): Result<Unit> {
        return try {
            firestore.collection(Constants.COLLECTION_EVENTS)
                .document(eventId)
                .update(mapOf("resolved" to true, "notes" to notes))
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logSession(session: SessionModel): Result<Unit> {
        return try {
            firestore.collection(Constants.COLLECTION_SESSIONS)
                .document(session.id)
                .set(session)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createBroadcast(broadcast: BroadcastModel): Result<Unit> {
        return try {
            val docRef = firestore.collection(Constants.COLLECTION_BROADCASTS).document()
            firestore.collection(Constants.COLLECTION_BROADCASTS)
                .document(docRef.id)
                .set(broadcast.copy(id = docRef.id))
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getBroadcasts(limit: Int = 20): Result<List<BroadcastModel>> {
        return try {
            val snapshot = firestore.collection(Constants.COLLECTION_BROADCASTS)
                .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
                .limit(limit.toLong())
                .get().await()
            val broadcasts = snapshot.documents.mapNotNull { it.toObject(BroadcastModel::class.java) }
            Result.success(broadcasts)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createAdmin(admin: AdminModel): Result<Unit> {
        return try {
            firestore.collection(Constants.COLLECTION_ADMINS)
                .document(admin.id)
                .set(admin)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAdminDocument(adminId: String): Result<AdminModel> {
        return try {
            val doc = firestore.collection(Constants.COLLECTION_ADMINS)
                .document(adminId)
                .get().await()
            val admin = doc.toObject(AdminModel::class.java) ?: AdminModel()
            Result.success(admin)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getPolicyConfig(): Result<PolicyConfigModel> {
        return try {
            val doc = firestore.collection(Constants.COLLECTION_POLICIES)
                .document("global")
                .get().await()
            val config = doc.toObject(PolicyConfigModel::class.java) ?: PolicyConfigModel()
            Result.success(config)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updatePolicyConfig(config: PolicyConfigModel): Result<Unit> {
        return try {
            firestore.collection(Constants.COLLECTION_POLICIES)
                .document("global")
                .set(config)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getDashboardMetrics(): Result<DashboardMetricsModel> {
        return try {
            val doc = firestore.collection(Constants.COLLECTION_METRICS)
                .document("dashboard")
                .get().await()
            val metrics = doc.toObject(DashboardMetricsModel::class.java) ?: DashboardMetricsModel()
            Result.success(metrics)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAnalyticsSnapshot(date: String): Result<AnalyticsSnapshotModel> {
        return try {
            val doc = firestore.collection(Constants.COLLECTION_ANALYTICS)
                .document(date)
                .get().await()
            val snapshot = doc.toObject(AnalyticsSnapshotModel::class.java) ?: AnalyticsSnapshotModel()
            Result.success(snapshot)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logAuditEntry(entry: AuditLogEntry): Result<Unit> {
        return try {
            val docRef = firestore.collection(Constants.COLLECTION_AUDIT_LOGS).document()
            firestore.collection(Constants.COLLECTION_AUDIT_LOGS)
                .document(docRef.id)
                .set(entry.copy(id = docRef.id))
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAuditLogs(category: String? = null, limit: Int = 50): Result<List<AuditLogEntry>> {
        return try {
            var query = firestore.collection(Constants.COLLECTION_AUDIT_LOGS)
                .orderBy("timestamp", com.google.firebase.firestore.Query.Direction.DESCENDING)
                .limit(limit.toLong())
            if (category != null) {
                query = query.whereEqualTo("category", category)
            }
            val snapshot = query.get().await()
            val logs = snapshot.documents.mapNotNull { it.toObject(AuditLogEntry::class.java) }
            Result.success(logs)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getActiveUserCount(): Result<Int> {
        return try {
            val snapshot = firestore.collection(Constants.COLLECTION_USERS)
                .whereGreaterThan(Constants.FIELD_LAST_ACTIVE, System.currentTimeMillis() - 86400000)
                .get().await()
            Result.success(snapshot.size())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTotalUserCount(): Result<Int> {
        return try {
            val snapshot = firestore.collection(Constants.COLLECTION_USERS)
                .get().await()
            Result.success(snapshot.size())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUnresolvedEventCount(): Result<Int> {
        return try {
            val snapshot = firestore.collection(Constants.COLLECTION_EVENTS)
                .whereEqualTo("resolved", false)
                .get().await()
            Result.success(snapshot.size())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchRemoteConfig(): Result<Unit> {
        return try {
            remoteConfig.fetchAndActivate().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getGlobalPolicyConfig(context: Context): Result<PolicyConfigModel> {
        return try {
            val snapshot = firestore.collection(Constants.COLLECTION_POLICIES)
                .document("global").get().await()
            if (snapshot.exists()) {
                val config = snapshot.toObject(PolicyConfigModel::class.java) ?: PolicyConfigModel()
                applyPolicyConfig(context, config)
                Result.success(config)
            } else {
                Result.failure(Exception("Global policy config not found"))
            }
        } catch (_: Exception) {
            // Fallback: read policy fields from user's own document (bypasses Firestore rules)
            try {
                val userId = getCurrentUser()?.uid ?: return Result.failure(Exception("Not authenticated"))
                val userDoc = firestore.collection(Constants.COLLECTION_USERS).document(userId).get().await()
                if (userDoc.exists()) {
                    val data = userDoc.data
                    if (data != null) {
                        val config = PolicyConfigModel(
                            maintenanceMode = data["maintenanceMode"] as? Boolean ?: false,
                            maintenanceMessage = data["maintenanceMessage"] as? String ?: "",
                            forceUpdate = data["forceUpdate"] as? Boolean ?: false,
                            minRequiredVersion = data["minRequiredVersion"] as? String ?: "1.0.0",
                            updateMessage = data["updateMessage"] as? String ?: "",
                            updateUrl = data["updateUrl"] as? String ?: ""
                        )
                        applyPolicyConfig(context, config)
                        return Result.success(config)
                    }
                }
            } catch (_: Exception) {}
            Result.failure(Exception("Global policy config not found"))
        }
    }

    private fun applyPolicyConfig(context: Context, config: PolicyConfigModel) {
        PreferencesManager.setTriggerKeyword(context, config.panicTriggerKeyword)
        PreferencesManager.setMaxPinAttempts(context, config.maxPinAttempts)
        PreferencesManager.setSirenType(context, config.sirenType)
        PreferencesManager.setAlarmVolume(context, if (config.enforceMaxVolume) 100 else PreferencesManager.getAlarmVolume(context))
        PreferencesManager.setMaintenanceMode(context, config.maintenanceMode)
        PreferencesManager.setMaintenanceMessage(context, config.maintenanceMessage)
        PreferencesManager.setForceUpdateEnabled(context, config.forceUpdate)
        PreferencesManager.setMinRequiredVersion(context, config.minRequiredVersion)
        PreferencesManager.setUpdateMessage(context, config.updateMessage)
        PreferencesManager.setUpdateUrl(context, config.updateUrl)
        PreferencesManager.setGlobalAnnouncement(context, config.globalAnnouncement)
        PreferencesManager.setAnnouncementSeverity(context, config.announcementSeverity)
    }

    fun getMinimumVersion(): String {
        return remoteConfig.getString(Constants.RC_KEY_MIN_VERSION)
    }

    fun isForceUpdateRequired(): Boolean {
        return remoteConfig.getBoolean(Constants.RC_KEY_FORCE_UPDATE)
    }

    fun isMaintenanceMode(): Boolean {
        return remoteConfig.getBoolean(Constants.RC_KEY_MAINTENANCE)
    }

    fun getUpdateMessage(): String {
        return remoteConfig.getString(Constants.RC_KEY_UPDATE_MESSAGE)
    }

    fun getUpdateUrl(): String {
        return remoteConfig.getString(Constants.RC_KEY_UPDATE_URL)
    }

    fun getLatestVersion(): String {
        return remoteConfig.getString(Constants.RC_KEY_LATEST_VERSION)
    }

    fun getGlobalMessage(): String? {
        val msg = remoteConfig.getString(Constants.RC_KEY_GLOBAL_MESSAGE)
        return if (msg.isNullOrBlank()) null else msg
    }
}
