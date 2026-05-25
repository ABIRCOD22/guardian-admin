package com.securphone.app.ui.update

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.securphone.app.data.firebase.FirebaseManager
import com.securphone.app.data.preferences.PreferencesManager
import com.securphone.app.databinding.ActivityForceUpdateBinding
import com.securphone.app.ui.main.MainActivity
import com.securphone.app.utils.Constants
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class ForceUpdateActivity : AppCompatActivity() {

    private lateinit var binding: ActivityForceUpdateBinding
    private var pollJob: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityForceUpdateBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val msg = PreferencesManager.getUpdateMessage(this).takeIf { it.isNotBlank() }
            ?: FirebaseManager.getUpdateMessage().takeIf { it.isNotBlank() }
            ?: "A new version is available. Please update to continue using this app."
        binding.tvMessage.text = msg

        binding.btnUpdate.setOnClickListener {
            val url = PreferencesManager.getUpdateUrl(this).takeIf { it.isNotBlank() }
                ?: FirebaseManager.getUpdateUrl().takeIf { it.isNotBlank() }
                ?: Constants.PLAY_STORE_URL
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        }

        pollJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                try {
                    FirebaseManager.fetchRemoteConfig()
                    FirebaseManager.getGlobalPolicyConfig(this@ForceUpdateActivity)
                } catch (_: Exception) {}
                val enabled = PreferencesManager.isForceUpdateEnabled(this@ForceUpdateActivity)
                val minVersion = if (enabled) {
                    PreferencesManager.getMinRequiredVersion(this@ForceUpdateActivity)
                } else {
                    if (!FirebaseManager.isForceUpdateRequired()) {
                        launch(Dispatchers.Main) { exitForceUpdate() }; return@launch
                    }
                    FirebaseManager.getMinimumVersion()
                }
                if (minVersion.isBlank() || !isVersionLowerThan(Constants.CURRENT_VERSION, minVersion)) {
                    launch(Dispatchers.Main) { exitForceUpdate() }; return@launch
                }
                delay(10000)
            }
        }
    }

    private fun exitForceUpdate() {
        val i = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(i)
        finish()
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

    override fun onDestroy() {
        pollJob?.cancel()
        super.onDestroy()
    }

    override fun onBackPressed() {
    }
}
