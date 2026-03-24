package viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import models.IPTVProfile
import repository.SettingsRepository

class ProfileViewModel(private val settingsRepository: SettingsRepository) : ViewModel() {

    private val _profiles = MutableStateFlow<List<IPTVProfile>>(emptyList())
    val profiles: StateFlow<List<IPTVProfile>> = _profiles.asStateFlow()

    private val _activeProfile = MutableStateFlow<IPTVProfile?>(null)
    val activeProfile: StateFlow<IPTVProfile?> = _activeProfile.asStateFlow()

    init {
        loadProfiles()
    }

    private fun loadProfiles() {
        viewModelScope.launch {
            val savedProfiles = settingsRepository.getProfiles()
            _profiles.value = savedProfiles

            val activeId = settingsRepository.getActiveProfileId()
            if (activeId != null) {
                _activeProfile.value = savedProfiles.find { it.id == activeId }
            } else if (savedProfiles.isNotEmpty()) {
                // Default to first profile if none active
                setActiveProfile(savedProfiles.first())
            }
        }
    }

    fun addProfile(profile: IPTVProfile) {
        val updatedList = _profiles.value + profile
        _profiles.value = updatedList
        settingsRepository.saveProfiles(updatedList)

        if (_activeProfile.value == null) {
             setActiveProfile(profile)
        }
    }

    fun setActiveProfile(profile: IPTVProfile) {
        _activeProfile.value = profile
        settingsRepository.setActiveProfileId(profile.id)
    }

    fun deleteProfile(profileId: String) {
        val updatedList = _profiles.value.filter { it.id != profileId }
        _profiles.value = updatedList
        settingsRepository.saveProfiles(updatedList)

        if (_activeProfile.value?.id == profileId) {
            val newActive = updatedList.firstOrNull()
            _activeProfile.value = newActive
            newActive?.let { settingsRepository.setActiveProfileId(it.id) }
        }
    }
}
