package com.securphone.app.ui.main

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.securphone.app.R
import com.securphone.app.data.NotificationStore
import com.securphone.app.data.firebase.FirebaseManager
import com.securphone.app.data.preferences.PreferencesManager
import com.securphone.app.databinding.ActivityMainBinding
import com.securphone.app.services.ProtectionService
import com.securphone.app.ui.maintenance.MaintenanceActivity
import com.securphone.app.ui.setup.SetupWizardActivity
import com.securphone.app.ui.update.ForceUpdateActivity
import com.securphone.app.utils.Constants
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onStart() {
        super.onStart()
        if (!PreferencesManager.isSetupCompleted(this)) {
            val setupIntent = Intent(this, SetupWizardActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(setupIntent)
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        checkPolicyConfig()
    }

    private var lastPolicyCheck = 0L

    private fun checkPolicyConfig() {
        val now = System.currentTimeMillis()
        if (now - lastPolicyCheck < 30000) return
        lastPolicyCheck = now

        CoroutineScope(Dispatchers.IO).launch {
            try {
                FirebaseManager.fetchRemoteConfig()
                FirebaseManager.getGlobalPolicyConfig(this@MainActivity)
            } catch (_: Exception) {}
            val ctx = this@MainActivity
            if (PreferencesManager.isMaintenanceMode(ctx) || FirebaseManager.isMaintenanceMode()) {
                val i = Intent(ctx, MaintenanceActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
                launch(Dispatchers.Main) { ctx.startActivity(i); ctx.finish() }
                return@launch
            }
            val enabled = PreferencesManager.isForceUpdateEnabled(ctx)
            val minVersion = if (enabled) {
                PreferencesManager.getMinRequiredVersion(ctx)
            } else {
                if (!FirebaseManager.isForceUpdateRequired()) return@launch
                FirebaseManager.getMinimumVersion()
            }
            if (minVersion.isNotBlank() && isVersionLowerThan(Constants.CURRENT_VERSION, minVersion)) {
                val i = Intent(ctx, ForceUpdateActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
                launch(Dispatchers.Main) { ctx.startActivity(i); ctx.finish() }
            }
        }
    }

    private fun isVersionLowerThan(current: String, minimum: String): Boolean {
        val currentParts = current.split(".").map { it.toIntOrNull() ?: 0 }
        val minParts = minimum.split(".").map { it.toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(currentParts.size, minParts.size)) {
            val c = currentParts.getOrElse(i) { 0 }
            val m = minParts.getOrElse(i) { 0 }
            if (c < m) return true
            if (c > m) return false
        }
        return false
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (PreferencesManager.isProtectionActive(this)) {
            val serviceIntent = Intent(this, ProtectionService::class.java).apply {
                action = ProtectionService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        }

        showGlobalAnnouncementIfNeeded()

        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(R.id.main_fragment_container, HomeFragment())
                .commit()
        }

        binding.bottomNavigation.setOnItemSelectedListener { item ->
            val selectedFragment: Fragment = when (item.itemId) {
                R.id.nav_home -> HomeFragment()
                R.id.nav_features -> FeaturesFragment()
                R.id.nav_profile -> ProfileFragment()
                else -> HomeFragment()
            }
            supportFragmentManager.beginTransaction()
                .replace(R.id.main_fragment_container, selectedFragment)
                .commit()
            true
        }

        binding.ivNotifications.setOnClickListener {
            showNotificationDialog()
        }
    }

    private fun showGlobalAnnouncementIfNeeded() {
        val announcement = PreferencesManager.getGlobalAnnouncement(this)
        if (announcement.isBlank()) return
        val severity = PreferencesManager.getAnnouncementSeverity(this)
        val title = when (severity) {
            "warning" -> "Warning"
            "critical" -> "Critical Alert"
            else -> "Announcement"
        }
        PreferencesManager.setGlobalAnnouncement(this, "")
        AlertDialog.Builder(this, R.style.AlertDialogCustom)
            .setTitle(title)
            .setMessage(announcement)
            .setPositiveButton("OK") { d, _ -> d.dismiss() }
            .show()
    }

    private fun showNotificationDialog() {
        val broadcasts = NotificationStore.getAll()
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 8, 24, 8)
        }
        if (broadcasts.isEmpty()) {
            container.addView(TextView(this).apply {
                text = "No notifications yet"
                setTextColor(ContextCompat.getColor(context, R.color.text_secondary))
                textSize = 14f
                gravity = android.view.Gravity.CENTER
                setPadding(0, 32, 0, 32)
            })
        } else {
            val dateFormat = SimpleDateFormat("MMM dd HH:mm", Locale.getDefault())
            broadcasts.forEach { b ->
                val item = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(0, 12, 0, 12)
                }
                item.addView(TextView(this).apply {
                    text = b.title
                    setTextColor(ContextCompat.getColor(context, R.color.white))
                    textSize = 14f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                })
                item.addView(TextView(this).apply {
                    text = b.body
                    setTextColor(ContextCompat.getColor(context, R.color.text_secondary))
                    textSize = 12f
                })
                item.addView(TextView(this).apply {
                    text = dateFormat.format(Date(b.createdAt))
                    setTextColor(ContextCompat.getColor(context, R.color.text_secondary))
                    textSize = 10f
                })
                container.addView(item)
            }
            NotificationStore.markAllRead()
        }
        AlertDialog.Builder(this, R.style.AlertDialogCustom)
            .setTitle("Notifications")
            .setView(container)
            .setPositiveButton("Dismiss") { d, _ -> d.dismiss() }
            .show()
    }
}
