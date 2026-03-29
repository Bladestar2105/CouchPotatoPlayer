# Why IPTV-Manager Proxy Works on Web But Not Apple TV

## The Key Difference: Server-Side vs Device-Side Proxy

### IPTV-Manager (Works on Web)
IPTV-Manager uses a **Node.js server-side proxy**:

```javascript
// Node.js server fetches upstream and pipes raw bytes to browser
upstream.body.pipe(res);  // Raw TS bytes → Browser
```

This works because:
1. **Web browsers have MSE-based players** (hls.js, mpegts.js) that can demux raw TS in JavaScript
2. The proxy is running on a **server**, not constrained by Apple's AVPlayer limitations
3. Browser's `<video>` element with mpegts.js handles raw TS natively via Media Source Extensions

```
[Upstream TS] → [Node.js Proxy] → [Browser + mpegts.js] → Display ✅
```

### CouchPotatoPlayer (Apple TV Problem)
The Swift proxy runs **inside the Apple TV app** and tries to work with AVPlayer:

```
[Upstream TS] → [Swift Proxy] → [AVPlayer] → ❌ FREEZES
                        ↓
              AVPlayer says "I can't demux TS!"
```

**Problem:** AVPlayer fundamentally cannot play raw MPEG-TS — it's a hard Apple limitation.

## Why AVPlayer Cannot Play Raw TS

| Player | Platform | Raw TS Support | Reason |
|--------|----------|----------------|--------|
| AVPlayer | iOS/tvOS/macOS | ❌ NO | Only supports HLS (`.m3u8`), MP4, MOV |
| VLC (TVVLCKit) | tvOS | ✅ YES | Has native MPEG-TS demuxer |
| HTML5 + mpegts.js | Web | ✅ YES | JavaScript demuxer in browser |
| HTML5 + hls.js | Web | ✅ YES | HLS parser + MSE |
| FFmpeg | Any | ✅ YES | Full codec support |

### AVPlayer's Supported Formats (from Apple docs)
- **HLS** (HTTP Live Streaming) with `.m3u8` playlists
- **Progressive MP4/MOV** containers
- **Some other formats** (but NOT raw MPEG-TS)

### Why the TSSegmenter Approach Failed
My first attempt (commit `4c9e845`) tried to wrap raw TS in HLS segments:

```swift
// ❌ Broken approach
func splitIntoSegments(data: Data) {
    // Split by byte count → Corrupt segments!
    segments.append(data.prefix(200000))  // Wrong boundary
}
```

**Why it fails:**
- HLS segments **MUST** start with **PAT + PMT TS packets** (table data)
- HLS segments **MUST** start on **IDR keyframe boundaries**
- Byte-based splitting produces segments that fail AVPlayer's strict validation
- Results in `-12860` / `-12753` errors every time

## The Only Working Solutions

### Solution 1: VLC as Primary Player (Implemented ✅)
```typescript
// VideoPlayer.tsx smart routing
if (streamKind === 'ts') {
    return renderVLCPlayer();  // VLC has native TS demuxer
} else if (streamKind === 'hls' || streamKind === 'mp4') {
    return renderAVPlayer();   // AVPlayer handles these natively
}
```

**How it works:**
- VLC (via TVVLCKit) has its own MPEG-TS demuxer built-in
- No proxy transformation needed — just pass-through
- Swift proxy still useful for header forwarding and ATS bypass

```
[Upstream TS] → [Swift Proxy] → [VLC Player] → Display ✅
```

### Solution 2: Server-Side Transcoding (Not Implemented)
Like IPTV-Manager does with FFmpeg:

```javascript
ffmpeg(upstream.body)
  .inputFormat('mpegts')
  .outputOptions('-c:v copy', '-c:a aac', '-b:a 128k', '-f mp4')
  .pipe(res);
```

**Why this works:**
- FFmpeg converts raw TS → valid MP4 container on the **server**
- AVPlayer can play the resulting MP4
- Downside: Server CPU cost, latency

### Solution 3: HLS Upstream Only (Depends on Provider)
If the IPTV provider offers HLS streams:

```
[Upstream .m3u8] → [AVPlayer] → Display ✅
```

**Limitation:** Many IPTV providers only offer raw TS streams.

## Comparison: Web vs Apple TV

| Aspect | Web Browser | Apple TV (AVPlayer) |
|--------|-------------|---------------------|
| Raw TS Playback | ✅ via mpegts.js | ❌ Not supported |
| HLS Playback | ✅ via hls.js or native | ✅ Native support |
| MP4 Playback | ✅ Native | ✅ Native |
| Extensible | ✅ JS libraries can add formats | ❌ Fixed by Apple |
| Transcoding | Can use FFmpeg.js | ❌ No FFmpeg on device |
| Proxy Location | Server or browser | Only on-device possible |

## Why IPTV-Manager's Proxy Doesn't Help Apple TV

Even if we copied IPTV-Manager's exact proxy code to Swift:

```swift
// Swift equivalent of Node.js proxy
upstream.body.pipe(res)  // Still pipes raw TS
```

**The problem remains:** AVPlayer still receives raw TS bytes and says "I don't know what this is."

The proxy only moves the problem:
- **IPTV-Manager:** Proxy → Browser (browser can handle TS) ✅
- **CouchPotatoPlayer:** Proxy → AVPlayer (AVPlayer can't handle TS) ❌

## Conclusion

**The proxy isn't the problem — AVPlayer is.**

The only viable solution for Apple TV is:
1. **Use VLC** for raw TS streams (what we implemented)
2. **Use AVPlayer** only for HLS/MP4 (what we implemented)
3. **Smart auto-detection** to route to correct player (what we implemented)

There is NO way to make AVPlayer play raw TS — it's a hard platform limitation, not a bug we can fix with proxy tricks.