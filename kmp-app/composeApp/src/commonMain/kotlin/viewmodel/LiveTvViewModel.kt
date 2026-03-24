package viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import api.XtreamClient
import api.M3UClient
import api.StalkerClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import models.Category
import models.Channel
import models.IPTVProfile
import utils.Logger

class LiveTvViewModel(
    private val profileViewModel: ProfileViewModel,
    private val xtreamClient: XtreamClient = XtreamClient(),
    private val m3uClient: M3UClient = M3UClient(),
    private val stalkerClient: StalkerClient = StalkerClient()
) : ViewModel() {

    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    private val _channels = MutableStateFlow<List<Channel>>(emptyList())
    val channels: StateFlow<List<Channel>> = _channels.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun loadData() {
        val currentProfile = profileViewModel.activeProfile.value ?: return

        viewModelScope.launch {
            _isLoading.value = true
            try {
                when (currentProfile) {
                    is IPTVProfile.XtreamProfile -> {
                        val fetchedCategories = xtreamClient.getLiveCategories(currentProfile)
                        _categories.value = fetchedCategories

                        val fetchedChannels = xtreamClient.getLiveStreams(currentProfile)
                        _channels.value = fetchedChannels
                    }
                    is IPTVProfile.M3UProfile -> {
                        val fetchedChannels = m3uClient.fetchPlaylist(currentProfile)
                        _channels.value = fetchedChannels
                        // Synthesize categories from group attributes
                        _categories.value = fetchedChannels.map { it.group }.distinct().map { Category(it, it) }
                    }
                    is IPTVProfile.StalkerProfile -> {
                        val fetchedCategories = stalkerClient.getLiveCategories(currentProfile)
                        _categories.value = fetchedCategories

                        val fetchedChannels = stalkerClient.getLiveStreams(currentProfile)
                        _channels.value = fetchedChannels
                    }
                }
            } catch (e: Exception) {
                Logger.error("Failed to load Live TV data", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
}