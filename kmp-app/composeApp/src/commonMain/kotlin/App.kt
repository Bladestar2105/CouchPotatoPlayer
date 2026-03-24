import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import cafe.adriel.voyager.navigator.Navigator
import cafe.adriel.voyager.transitions.SlideTransition
import repository.SettingsRepository
import screens.ProfileSelectionScreen
import viewmodel.ProfileViewModel

@Composable
fun App() {
    val settingsRepository = remember { SettingsRepository() }
    val profileViewModel = remember { ProfileViewModel(settingsRepository) }

    MaterialTheme {
        Navigator(ProfileSelectionScreen(profileViewModel)) { navigator ->
            SlideTransition(navigator)
        }
    }
}