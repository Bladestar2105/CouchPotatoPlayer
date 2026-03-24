package screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import models.Movie
import modifiers.tvFocusable

@Composable
fun VODListContent(movies: List<Movie>, onMovieSelect: (Movie) -> Unit) {
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
                        .clickable { onMovieSelect(movie) }
                        .aspectRatio(0.7f) // approximate poster aspect ratio
                ) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = movie.name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(8.dp))
                    }
                }
            }
        }
    }
}