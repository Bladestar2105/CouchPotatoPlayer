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
import models.Series
import modifiers.tvFocusable

@Composable
fun SeriesListContentList(series: List<Series>, onSeriesSelect: (Series) -> Unit) {
    if (series.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No Series Available")
        }
    } else {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 120.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(series) { ser ->
                Card(
                    modifier = Modifier
                        .padding(8.dp)
                        .tvFocusable()
                        .clickable { onSeriesSelect(ser) }
                        .aspectRatio(0.7f) // approximate poster aspect ratio
                ) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = ser.name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(8.dp))
                    }
                }
            }
        }
    }
}