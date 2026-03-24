package components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import repository.SettingsRepository

@Composable
fun PinEntryDialog(
    settingsRepository: SettingsRepository,
    onDismiss: () -> Unit,
    onSuccess: () -> Unit
) {
    var pin by remember { mutableStateOf("") }
    var showError by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Adult Content") },
        text = {
            Column {
                Text("Please enter your PIN to view this content.", modifier = Modifier.padding(bottom = 8.dp))
                OutlinedTextField(
                    value = pin,
                    onValueChange = { pin = it },
                    label = { Text("PIN") },
                    modifier = Modifier.fillMaxWidth()
                )
                if (showError) {
                    Text(
                        text = "Invalid PIN.",
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (settingsRepository.validatePin(pin)) {
                        onSuccess()
                    } else {
                        showError = true
                    }
                }
            ) {
                Text("Confirm")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
