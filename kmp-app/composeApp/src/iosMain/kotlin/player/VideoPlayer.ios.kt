package player

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import cocoapods.MobileVLCKit.VLCMedia
import cocoapods.MobileVLCKit.VLCMediaPlayer
import kotlinx.cinterop.ExperimentalForeignApi
import platform.Foundation.NSURL
import platform.UIKit.UIView

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun VideoPlayer(
    modifier: Modifier,
    url: String,
    autoPlay: Boolean
) {
    val mediaPlayer = remember { VLCMediaPlayer() }

    LaunchedEffect(url) {
        if (url.isNotEmpty()) {
            val nsUrl = NSURL.URLWithString(url)
            if (nsUrl != null) {
                val media = VLCMedia(uRL = nsUrl)
                // Add IPTV specific caching/buffer options equivalent to Android
                media.addOption("--network-caching=1500")
                media.addOption("--drop-late-frames")
                media.addOption("--skip-frames")
                media.addOption("--rtsp-tcp")
                media.addOption("-vvv")
                mediaPlayer.media = media
                if (autoPlay) {
                    mediaPlayer.play()
                }
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            mediaPlayer.stop()
            mediaPlayer.drawable = null
        }
    }

    UIKitView(
        factory = {
            val view = UIView()
            mediaPlayer.drawable = view
            view
        },
        modifier = modifier
    )
}
