package viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import api.XtreamClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import models.Category
import models.Movie
import models.Series
import models.IPTVProfile
import utils.Logger

class VODViewModel(
    private val profileViewModel: ProfileViewModel,
    private val xtreamClient: XtreamClient = XtreamClient()
) : ViewModel() {

    private val _vodCategories = MutableStateFlow<List<Category>>(emptyList())
    val vodCategories: StateFlow<List<Category>> = _vodCategories.asStateFlow()

    private val _movies = MutableStateFlow<List<Movie>>(emptyList())
    val movies: StateFlow<List<Movie>> = _movies.asStateFlow()

    private val _seriesCategories = MutableStateFlow<List<Category>>(emptyList())
    val seriesCategories: StateFlow<List<Category>> = _seriesCategories.asStateFlow()

    private val _series = MutableStateFlow<List<Series>>(emptyList())
    val series: StateFlow<List<Series>> = _series.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun loadData() {
        val currentProfile = profileViewModel.activeProfile.value ?: return

        viewModelScope.launch {
            _isLoading.value = true
            try {
                if (currentProfile is IPTVProfile.XtreamProfile) {
                    val vodCats = xtreamClient.getVodCategories(currentProfile)
                    _vodCategories.value = vodCats

                    val vods = xtreamClient.getVodStreams(currentProfile)
                    _movies.value = vods

                    val seriesCats = xtreamClient.getSeriesCategories(currentProfile)
                    _seriesCategories.value = seriesCats

                    val ser = xtreamClient.getSeries(currentProfile)
                    _series.value = ser
                } else {
                    // M3U doesn't have native explicit VOD separation
                }
            } catch (e: Exception) {
                Logger.error("Failed to load VOD data", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
}