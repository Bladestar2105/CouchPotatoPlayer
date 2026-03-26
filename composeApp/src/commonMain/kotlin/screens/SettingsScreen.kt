package screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import viewmodel.ProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreenContent(
    profileViewModel: ProfileViewModel,
    onSwitchProfile: () -> Unit,
    onManagePin: () -> Unit,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Settings") })
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            Button(onClick = onSwitchProfile) {
                Text("Switch Profile")
            }
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = onManagePin) {
                Text("Manage Adult PIN")
            }
        }
    }
}