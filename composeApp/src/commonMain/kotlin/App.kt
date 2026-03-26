import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.togetherWith
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import navigation.NavigationState
import navigation.Screen
import navigation.rememberNavigationState
import repository.SettingsRepository
import screens.AddProfileScreenContent
import screens.HomeScreenContent
import screens.PinDialogScreenContent
import screens.PlayerScreenContent
import screens.ProfileSelectionScreenContent
import screens.SettingsScreenContent
import viewmodel.ProfileViewModel

@Composable
fun App() {
    val navigationState = rememberNavigationState()
    val settingsRepository = remember { SettingsRepository() }
    val profileViewModel = remember { ProfileViewModel(settingsRepository) }
    
    MaterialTheme {
        AnimatedContent(
            targetState = navigationState.currentScreen,
            transitionSpec = {
                slideInHorizontally(initialOffsetX = { it }) togetherWith 
                slideOutHorizontally(targetOffsetX = { -it })
            },
            label = "screen_transition"
        ) { screen ->
            when (screen) {
                is Screen.ProfileSelection -> ProfileSelectionScreenContent(
                    profileViewModel = profileViewModel,
                    onAddProfile = { navigationState.push(Screen.AddProfile) },
                    onProfileSelected = { navigationState.replaceAll(Screen.Home(screen.profileId ?: "default")) }
                )
                is Screen.AddProfile -> AddProfileScreenContent(
                    profileViewModel = profileViewModel,
                    onProfileAdded = { navigationState.pop() }
                )
                is Screen.Home -> HomeScreenContent(
                    profileViewModel = profileViewModel,
                    onSettings = { navigationState.push(Screen.Settings(screen.profileId)) },
                    onPlayStream = { url, title -> navigationState.push(Screen.Player(url, title)) },
                    onSwitchProfile = { navigationState.replaceAll(Screen.ProfileSelection()) }
                )
                is Screen.Settings -> SettingsScreenContent(
                    profileViewModel = profileViewModel,
                    onSwitchProfile = { navigationState.replaceAll(Screen.ProfileSelection()) },
                    onManagePin = { navigationState.push(Screen.PinDialog(screen.profileId)) },
                    onBack = { navigationState.pop() }
                )
                is Screen.PinDialog -> PinDialogScreenContent(
                    profileViewModel = profileViewModel,
                    onBack = { navigationState.pop() }
                )
                is Screen.Player -> PlayerScreenContent(
                    url = screen.url,
                    title = screen.title,
                    onBack = { navigationState.pop() }
                )
            }
        }
    }
}