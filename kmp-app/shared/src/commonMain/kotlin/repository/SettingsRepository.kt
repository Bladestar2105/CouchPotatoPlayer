package repository

import com.russhwolf.settings.Settings
import com.russhwolf.settings.get
import com.russhwolf.settings.set
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import models.IPTVProfile

class SettingsRepository(private val settings: Settings = Settings()) {

    private val json = Json { ignoreUnknownKeys = true }

    fun saveProfiles(profiles: List<IPTVProfile>) {
        val jsonString = json.encodeToString(profiles)
        settings["profiles"] = jsonString
    }

    fun getProfiles(): List<IPTVProfile> {
        val jsonString: String = settings["profiles", "[]"]
        return try {
            json.decodeFromString(jsonString)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun setActiveProfileId(profileId: String) {
        settings["active_profile_id"] = profileId
    }

    fun getActiveProfileId(): String? {
        return settings["active_profile_id"]
    }

    fun setAdultPin(pin: String) {
        settings["adult_pin"] = pin
    }

    fun getAdultPin(): String? {
        return settings["adult_pin"]
    }

    fun isAdultPinSet(): Boolean {
        return getAdultPin()?.isNotEmpty() == true
    }

    fun validatePin(pin: String): Boolean {
        return getAdultPin() == pin
    }

    fun clearSettings() {
        settings.clear()
    }
}
