package screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import viewmodel.ProfileViewModel

data class SettingsScreen(val profileViewModel: ProfileViewModel) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val navigator = cafe.adriel.voyager.navigator.LocalNavigator.currentOrThrow

        Scaffold(
            topBar = {
                TopAppBar(title = { Text("Settings") })
            }
        ) { padding ->
            Column(modifier = Modifier.padding(padding).padding(16.dp)) {
                Button(onClick = { navigator.push(ProfileSelectionScreen(profileViewModel)) }) {
                    Text("Switch Profile")
                }
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { navigator.push(PinDialogScreen(profileViewModel)) }) {
                    Text("Manage Adult PIN")
                }
            }
        }
    }
}