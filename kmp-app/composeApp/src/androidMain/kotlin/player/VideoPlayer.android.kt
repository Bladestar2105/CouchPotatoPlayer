package player

import android.net.Uri
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import org.videolan.libvlc.LibVLC
import org.videolan.libvlc.Media
import org.videolan.libvlc.MediaPlayer
import org.videolan.libvlc.util.VLCVideoLayout

@Composable
actual fun VideoPlayer(
    modifier: Modifier,
    url: String,
    autoPlay: Boolean
) {
    val context = LocalContext.current

    val libVLC = remember {
        val options = arrayListOf(
            "--network-caching=1500",
            "--drop-late-frames",
            "--skip-frames",
            "--rtsp-tcp",
            "-vvv"
        )
        LibVLC(context, options)
    }

    val mediaPlayer = remember { MediaPlayer(libVLC) }

    LaunchedEffect(url) {
        if (url.isNotEmpty()) {
            val media = Media(libVLC, Uri.parse(url))
            media.setHWDecoderEnabled(true, false)
            mediaPlayer.media = media
            if (autoPlay) {
                mediaPlayer.play()
            }
            media.release()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            mediaPlayer.stop()
            mediaPlayer.detachViews()
            mediaPlayer.release()
            libVLC.release()
        }
    }

    AndroidView(
        factory = { ctx ->
            VLCVideoLayout(ctx).apply {
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            }.also { layout ->
                mediaPlayer.attachViews(layout, null, false, false)
            }
        },
        modifier = modifier
    )
}
