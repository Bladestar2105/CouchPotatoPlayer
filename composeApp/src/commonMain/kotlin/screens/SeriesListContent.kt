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
import models.Series
import modifiers.tvFocusable
import components.PinEntryDialog
import repository.SettingsRepository

@Composable
fun SeriesListContentList(series: List<Series>, onSeriesSelect: (Series) -> Unit) {
    val settingsRepository = remember { SettingsRepository() }
    var seriesPendingPin by remember { mutableStateOf<Series?>(null) }

    if (seriesPendingPin != null) {
        PinEntryDialog(
            settingsRepository = settingsRepository,
            onDismiss = { seriesPendingPin = null },
            onSuccess = {
                onSeriesSelect(seriesPendingPin!!)
                seriesPendingPin = null
            }
        )
    }

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
                        .clickable {
                            if (ser.isAdult == true && settingsRepository.isAdultPinSet()) {
                                seriesPendingPin = ser
                            } else {
                                onSeriesSelect(ser)
                            }
                        }
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