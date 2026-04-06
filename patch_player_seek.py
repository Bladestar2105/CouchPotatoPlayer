import re

with open('screens/PlayerScreen.tsx', 'r') as f:
    content = f.read()

# Replace the overly frequent seek updates with debounced seeks to avoid crashing KSPlayer.
# Find handleTVRemoteEvent and replace the left/right logic.

replacement = """
    } else if (evt.eventType === 'left') {
      if (!canSeek) return;
      const newSeekTime = Math.max(0, currentTimeRef.current - 10000);
      currentTimeRef.current = newSeekTime;
      setPlaybackProgress(prev => ({ ...prev, currentTime: newSeekTime }));

      // Debounce the actual native seek to prevent KSPlayer from crashing on rapid Apple TV remote swipes
      if (window.seekDebounceTimer) clearTimeout(window.seekDebounceTimer);
      window.seekDebounceTimer = setTimeout(() => {
         setSeekTime(newSeekTime);
      }, 500);
      setShowOverlay(true);
    } else if (evt.eventType === 'right') {
      if (!canSeek) return;
      const maxTime = playbackProgress.duration || Infinity;
      const newSeekTime = Math.min(maxTime, currentTimeRef.current + 10000);
      currentTimeRef.current = newSeekTime;
      setPlaybackProgress(prev => ({ ...prev, currentTime: newSeekTime }));

      if (window.seekDebounceTimer) clearTimeout(window.seekDebounceTimer);
      window.seekDebounceTimer = setTimeout(() => {
         setSeekTime(newSeekTime);
      }, 500);
      setShowOverlay(true);
    }"""

content = re.sub(
    r"    } else if \(evt\.eventType === 'left'\) \{[\s\S]*?setShowOverlay\(true\);\n    \}",
    replacement,
    content
)

with open('screens/PlayerScreen.tsx', 'w') as f:
    f.write(content)
