package screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import viewmodel.ProfileViewModel

data class ProfileSelectionScreen(val profileViewModel: ProfileViewModel) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
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
                        onClick = { navigator.push(AddProfileScreen(profileViewModel)) },
                        modifier = Modifier.padding(top = 16.dp)
                    ) {
                        Text("Add Profile")
                    }
                } else {
                    profiles.forEach { profile ->
                        Button(
                            onClick = {
                                profileViewModel.setActiveProfile(profile)
                                navigator.replaceAll(HomeScreen(profileViewModel))
                            },
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                        ) {
                            Text(profile.name)
                        }
                    }
                    Button(
                        onClick = { navigator.push(AddProfileScreen(profileViewModel)) },
                        modifier = Modifier.padding(top = 16.dp)
                    ) {
                        Text("Add Another Profile")
                    }
                }
            }
        }
    }
}