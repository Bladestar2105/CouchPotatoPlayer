package components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import models.Channel
import modifiers.tvFocusable
import components.PinEntryDialog
import repository.SettingsRepository

@Composable
fun ChannelListContent(channels: List<Channel>, onChannelSelect: (Channel) -> Unit) {
    val settingsRepository = remember { SettingsRepository() }
    var channelPendingPin by remember { mutableStateOf<Channel?>(null) }

    if (channelPendingPin != null) {
        PinEntryDialog(
            settingsRepository = settingsRepository,
            onDismiss = { channelPendingPin = null },
            onSuccess = {
                onChannelSelect(channelPendingPin!!)
                channelPendingPin = null
            }
        )
    }

    if (channels.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No Channels Available")
        }
    } else {
        LazyColumn(modifier = Modifier.fillMaxSize()) {
            items(channels) { channel ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp)
                        .tvFocusable()
                        .clickable {
                            if (channel.isAdult == true && settingsRepository.isAdultPinSet()) {
                                channelPendingPin = channel
                            } else {
                                onChannelSelect(channel)
                            }
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (!channel.logo.isNullOrEmpty()) {
                            AsyncImage(
                                model = channel.logo,
                                contentDescription = "${channel.name} logo",
                                modifier = Modifier
                                    .size(64.dp)
                                    .padding(end = 16.dp)
                            )
                        }
                        Column {
                            Text(text = channel.name, style = MaterialTheme.typography.titleMedium)
                            Text(text = channel.group, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}