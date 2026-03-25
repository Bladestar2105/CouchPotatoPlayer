package modifiers

import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * A custom modifier designed for TV (D-Pad) focus management.
 * In Compose Multiplatform for Android TV / tvOS, components need explicit
 * visual feedback when they gain spatial focus.
 */
fun Modifier.tvFocusable(
    focusedBorderColor: Color = Color.White,
    unfocusedBorderColor: Color = Color.Transparent,
    borderWidth: Float = 3f
): Modifier = composed {
    var isFocused by remember { mutableStateOf(false) }

    this
        .onFocusChanged { focusState ->
            isFocused = focusState.isFocused
        }
        .focusable()
        .border(
            width = borderWidth.dp,
            color = if (isFocused) focusedBorderColor else unfocusedBorderColor
        )
}