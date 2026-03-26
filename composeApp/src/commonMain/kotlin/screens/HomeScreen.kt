package screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import repository.SettingsRepository
import viewmodel.LiveTvViewModel
import viewmodel.ProfileViewModel
import viewmodel.VODViewModel
import models.Category
import components.ChannelListContent

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreenContent(
    profileViewModel: ProfileViewModel,
    onSettings: () -> Unit,
    onPlayStream: (String, String) -> Unit,
    onSwitchProfile: () -> Unit
) {
    val activeProfile by profileViewModel.activeProfile.collectAsState()

    val liveTvViewModel = remember { LiveTvViewModel(profileViewModel) }
    val vodViewModel = remember { VODViewModel(profileViewModel) }

    var selectedTabIndex by remember { mutableIntStateOf(0) }
    val tabs = listOf("Live TV", "Movies", "Series")

    LaunchedEffect(activeProfile) {
        if (activeProfile != null) {
            liveTvViewModel.loadData()
            vodViewModel.loadData()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(activeProfile?.name ?: "Home") },
                actions = {
                    IconButton(onClick = onSettings) {
                        Text("\u2699\uFE0F")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            TabRow(
                selectedTabIndex = selectedTabIndex,
                modifier = Modifier.fillMaxWidth()
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTabIndex == index,
                        onClick = { selectedTabIndex = index },
                        text = { Text(title) }
                    )
                }
            }

            Box(modifier = Modifier.fillMaxSize().padding(8.dp)) {
                when (selectedTabIndex) {
                    0 -> LiveTvContentNew(liveTvViewModel, onPlayStream)
                    1 -> MovieListContentNew(vodViewModel, onPlayStream)
                    2 -> SeriesListContentNew(vodViewModel, onPlayStream)
                }
            }
        }
    }
}

@Composable
fun LiveTvContentNew(viewModel: LiveTvViewModel, onPlayStream: (String, String) -> Unit) {
    val channels by viewModel.channels.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var selectedCategory by remember { mutableStateOf<Category?>(null) }

    val filteredChannels = remember(channels, selectedCategory) {
        if (selectedCategory == null) channels else channels.filter { it.categoryId == selectedCategory?.categoryId || it.group == selectedCategory?.categoryId }
    }

    if (isLoading) {
        CircularProgressIndicator(modifier = Modifier.fillMaxSize().wrapContentSize())
    } else {
        Row(modifier = Modifier.fillMaxSize()) {
            CategoryMenu(
                categories = categories,
                selectedCategory = selectedCategory,
                onCategorySelect = { selectedCategory = it }
            )
            ChannelListContent(filteredChannels, onChannelSelect = { channel ->
                onPlayStream(channel.url, channel.name)
            })
        }
    }
}

@Composable
fun MovieListContentNew(viewModel: VODViewModel, onPlayStream: (String, String) -> Unit) {
    val movies by viewModel.movies.collectAsState()
    val categories by viewModel.vodCategories.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var selectedCategory by remember { mutableStateOf<Category?>(null) }

    val filteredMovies = remember(movies, selectedCategory) {
        if (selectedCategory == null) movies else movies.filter { it.categoryId == selectedCategory?.categoryId || it.group == selectedCategory?.categoryId }
    }

    if (isLoading) {
        CircularProgressIndicator(modifier = Modifier.fillMaxSize().wrapContentSize())
    } else {
        Row(modifier = Modifier.fillMaxSize()) {
            CategoryMenu(
                categories = categories,
                selectedCategory = selectedCategory,
                onCategorySelect = { selectedCategory = it }
            )
            VODListContent(filteredMovies, onMovieSelect = { movie ->
                onPlayStream(movie.streamUrl, movie.name)
            })
        }
    }
}

@Composable
fun SeriesListContentNew(viewModel: VODViewModel, onPlayStream: (String, String) -> Unit) {
    val series by viewModel.series.collectAsState()
    val categories by viewModel.seriesCategories.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var selectedCategory by remember { mutableStateOf<Category?>(null) }

    val filteredSeries = remember(series, selectedCategory) {
        if (selectedCategory == null) series else series.filter { it.categoryId == selectedCategory?.categoryId || it.group == selectedCategory?.categoryId }
    }

    if (isLoading) {
        CircularProgressIndicator(modifier = Modifier.fillMaxSize().wrapContentSize())
    } else {
        Row(modifier = Modifier.fillMaxSize()) {
            CategoryMenu(
                categories = categories,
                selectedCategory = selectedCategory,
                onCategorySelect = { selectedCategory = it }
            )
            SeriesListContentList(filteredSeries, onSeriesSelect = { ser ->
                // In a real app, this goes to a Season/Episode selector
            })
        }
    }
}