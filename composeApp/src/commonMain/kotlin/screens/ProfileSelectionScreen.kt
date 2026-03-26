package screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import viewmodel.ProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileSelectionScreenContent(
    profileViewModel: ProfileViewModel,
    onAddProfile: () -> Unit,
    onProfileSelected: () -> Unit
) {
    val profiles by profileViewModel.profiles.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Select Profile") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (profiles.isEmpty()) {
                Text("No profiles found. Please add one.")
                Button(
                    onClick = onAddProfile,
                    modifier = Modifier.padding(top = 16.dp)
                ) {
                    Text("Add Profile")
                }
            } else {
                profiles.forEach { profile ->
                    Button(
                        onClick = {
                            profileViewModel.setActiveProfile(profile)
                            onProfileSelected()
                        },
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                    ) {
                        Text(profile.name)
                    }
                }
                Button(
                    onClick = onAddProfile,
                    modifier = Modifier.padding(top = 16.dp)
                ) {
                    Text("Add Another Profile")
                }
            }
        }
    }
}