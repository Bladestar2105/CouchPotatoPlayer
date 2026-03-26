package screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import models.Movie
import modifiers.tvFocusable
import components.PinEntryDialog
import repository.SettingsRepository

@Composable
fun VODListContent(movies: List<Movie>, onMovieSelect: (Movie) -> Unit) {
    val settingsRepository = remember { SettingsRepository() }
    var moviePendingPin by remember { mutableStateOf<Movie?>(null) }

    if (moviePendingPin != null) {
        PinEntryDialog(
            settingsRepository = settingsRepository,
            onDismiss = { moviePendingPin = null },
            onSuccess = {
                onMovieSelect(moviePendingPin!!)
                moviePendingPin = null
            }
        )
    }

    if (movies.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No Movies Available")
        }
    } else {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 120.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(movies) { movie ->
                Card(
                    modifier = Modifier
                        .padding(8.dp)
                        .tvFocusable()
                        .clickable {
                            if (movie.isAdult == true && settingsRepository.isAdultPinSet()) {
                                moviePendingPin = movie
                            } else {
                                onMovieSelect(movie)
                            }
                        }
                        .aspectRatio(0.7f) // approximate poster aspect ratio
                ) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        if (!movie.cover.isNullOrEmpty()) {
                            AsyncImage(
                                model = movie.cover,
                                contentDescription = "${movie.name} cover",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Text(text = movie.name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(8.dp))
                        }
                    }
                }
            }
        }
    }
}