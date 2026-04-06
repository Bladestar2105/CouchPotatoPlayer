import re

with open('screens/PlayerScreen.tsx', 'r') as f:
    content = f.read()

# I accidentally duplicated the right block or left the original one? Let's fix it clean.
replacement = """
    } else if (evt.eventType === 'left') {
      if (!canSeek) return;
      const newSeekTime = Math.max(0, currentTimeRef.current - 10000);
      currentTimeRef.current = newSeekTime;
      setPlaybackProgress(prev => ({ ...prev, currentTime: newSeekTime }));

      if ((window as any).seekDebounceTimer) clearTimeout((window as any).seekDebounceTimer);
      (window as any).seekDebounceTimer = setTimeout(() => {
         setSeekTime(newSeekTime);
      }, 500);
      setShowOverlay(true);
    } else if (evt.eventType === 'right') {
      if (!canSeek) return;
      const maxTime = playbackProgress.duration || Infinity;
      const newSeekTime = Math.min(maxTime, currentTimeRef.current + 10000);
      currentTimeRef.current = newSeekTime;
      setPlaybackProgress(prev => ({ ...prev, currentTime: newSeekTime }));

      if ((window as any).seekDebounceTimer) clearTimeout((window as any).seekDebounceTimer);
      (window as any).seekDebounceTimer = setTimeout(() => {
         setSeekTime(newSeekTime);
      }, 500);
      setShowOverlay(true);
"""

# Let's clean the entire block between playPause and pageUp
content = re.sub(
    r"    \} else if \(evt\.eventType === 'left'\) \{[\s\S]*?(?=    \} else if \(evt\.eventType === 'pageUp')",
    replacement,
    content
)

with open('screens/PlayerScreen.tsx', 'w') as f:
    f.write(content)
