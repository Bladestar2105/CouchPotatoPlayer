package viewmodel

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import repository.SettingsRepository

class SettingsViewModel(private val settingsRepository: SettingsRepository) : ViewModel() {

    private val _isPinSet = MutableStateFlow(settingsRepository.isAdultPinSet())
    val isPinSet: StateFlow<Boolean> = _isPinSet.asStateFlow()

    private val _pinError = MutableStateFlow<String?>(null)
    val pinError: StateFlow<String?> = _pinError.asStateFlow()

    fun setAdultPin(pin: String) {
        settingsRepository.setAdultPin(pin)
        _isPinSet.value = true
        _pinError.value = null
    }

    fun validatePin(pin: String): Boolean {
        val isValid = settingsRepository.validatePin(pin)
        if (!isValid) {
            _pinError.value = "Invalid PIN"
        } else {
            _pinError.value = null
        }
        return isValid
    }

    fun clearPin() {
        settingsRepository.setAdultPin("")
        _isPinSet.value = false
        _pinError.value = null
    }
}