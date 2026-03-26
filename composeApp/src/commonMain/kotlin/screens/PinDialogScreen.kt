package screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import repository.SettingsRepository
import viewmodel.SettingsViewModel
import viewmodel.ProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PinDialogScreenContent(
    profileViewModel: ProfileViewModel,
    onBack: () -> Unit
) {
    val settingsRepository = remember { SettingsRepository() }
    val settingsViewModel = remember { SettingsViewModel(settingsRepository) }

    val isPinSet by settingsViewModel.isPinSet.collectAsState()
    var currentPin by remember { mutableStateOf("") }
    var newPin by remember { mutableStateOf("") }
    val pinError by settingsViewModel.pinError.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text(if (isPinSet) "Change PIN" else "Set PIN") }) }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp).fillMaxWidth()) {
            if (isPinSet) {
                OutlinedTextField(
                    value = currentPin,
                    onValueChange = { currentPin = it },
                    label = { Text("Enter Current PIN") },
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                )
            }

            OutlinedTextField(
                value = newPin,
                onValueChange = { newPin = it },
                label = { Text("Enter New PIN") },
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
            )

            if (pinError != null) {
                Text(pinError!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(bottom = 8.dp))
            }

            Button(
                onClick = {
                    if (isPinSet) {
                        if (settingsViewModel.validatePin(currentPin)) {
                            settingsViewModel.setAdultPin(newPin)
                            onBack()
                        }
                    } else {
                        settingsViewModel.setAdultPin(newPin)
                        onBack()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = newPin.length >= 4 && (!isPinSet || currentPin.length >= 4)
            ) {
                Text("Save PIN")
            }

            if (isPinSet) {
                Button(
                    onClick = {
                         if (settingsViewModel.validatePin(currentPin)) {
                            settingsViewModel.clearPin()
                            onBack()
                        }
                    },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Clear PIN")
                }
            }
        }
    }
}