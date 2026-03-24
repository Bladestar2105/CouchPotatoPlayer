package components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import models.Channel
import modifiers.tvFocusable

@Composable
fun ChannelListContent(channels: List<Channel>, onChannelSelect: (Channel) -> Unit) {
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
                        .clickable { onChannelSelect(channel) }
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = channel.name, style = MaterialTheme.typography.titleMedium)
                        Text(text = channel.group, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}