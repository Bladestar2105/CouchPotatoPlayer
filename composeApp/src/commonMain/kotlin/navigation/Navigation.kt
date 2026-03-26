package navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import models.Channel
import models.Movie
import models.Series
import repository.SettingsRepository
import viewmodel.ProfileViewModel

sealed interface Screen {
    data class ProfileSelection(val profileId: String? = null) : Screen
    data object AddProfile : Screen
    data class Home(val profileId: String) : Screen
    data class Settings(val profileId: String) : Screen
    data class PinDialog(val profileId: String) : Screen
    data class Player(val url: String, val title: String) : Screen
}

class NavigationState {
    private val _backStack = mutableStateListOf<Screen>(Screen.ProfileSelection())
    val backStack: List<Screen> get() = _backStack
    
    val currentScreen: Screen get() = _backStack.last()
    
    fun push(screen: Screen) {
        _backStack.add(screen)
    }
    
    fun pop() {
        if (_backStack.size > 1) {
            _backStack.removeAt(_backStack.size - 1)
        }
    }
    
    fun replaceAll(screen: Screen) {
        _backStack.clear()
        _backStack.add(screen)
    }
    
    fun popToFirst() {
        while (_backStack.size > 1) {
            _backStack.removeAt(_backStack.size - 1)
        }
    }
}

@Composable
fun rememberNavigationState(): NavigationState {
    return remember { NavigationState() }
}