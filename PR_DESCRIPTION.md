## Fix: Use VLC as Primary Player for TS Streams on tvOS

### Root Cause
**AVPlayer fundamentally cannot play raw MPEG-TS streams.** This is a hard Apple platform limitation, not a configuration issue. AVPlayer only supports HLS (`.m3u8`), MP4, and MOV container formats.

### Why IPTV-Manager's Proxy Doesn't Apply Here
IPTV-Manager uses a Node.js server-side proxy that pipes raw TS to web browsers. This works because browsers have JavaScript demuxers (mpegts.js) via Media Source Extensions. On Apple TV, AVPlayer has NO such demuxer — it's a fixed black box that only supports HLS/MP4.

### Solution
Complete architectural change — **VLC (via TVVLCKit) is now the primary player on tvOS** for MPEG-TS streams, while AVPlayer is reserved for what it actually supports (HLS & MP4).

### Changes
- Smart stream-type detection routes TS→VLC, HLS/MP4→AVPlayer
- Simplified SwiftTSPlayerProxy to pure pass-through for VLC only
- VLC imported on ALL native platforms including tvOS
- Default to VLC on tvOS
- Auto-fallback: if AVKit is selected but stream is TS, uses VLC

### Player Options Considered
See `PLAYER_COMPARISON.md` for detailed comparison of AVPlayer vs VLC vs KSPlayer. 

**VLC was chosen** because:
- Already integrated via react-native-vlc-media-player
- Proven in production (Apple-TV-Player, 160 stars)
- Minimal code changes needed
- Smaller bundle size (~3-5MB vs ~15-20MB for KSPlayer)

**KSPlayer** is an excellent future option if VLC proves problematic, but requires creating a React Native bridge and adds ~15-20MB to bundle size.

### Testing
- tvOS: TS streams should now play via VLC without freezing
- tvOS: HLS/MP4 streams still work via AVPlayer if AVKit is selected
- iOS: Unchanged behavior
- Android: Unchanged behavior