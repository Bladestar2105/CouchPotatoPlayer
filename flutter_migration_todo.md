# CouchPotatoPlayer - React Native to Flutter Migration TODO

## 🟢 Completed in Phase 1
- [x] Basic Flutter App Setup
- [x] State Management (`provider` + `shared_preferences`)
- [x] Local Storage for large datasets (`path_provider`)
- [x] Model Definitions (Xtream API compatible)
- [x] `XtreamService` API Layer (Auth, Categories, Streams, VOD, Series)
- [x] XMLTV Parser Logic
- [x] Welcome Screen (Login, `action=cpp` validation)
- [x] Home Screen Shell (Tabs: Live, Movies, Series)
- [x] Basic Channel/Grid Rendering (Mobile Layout)
- [x] Media Info Screen (VOD/Series Plot & Cover)
- [x] Live Player Screen (`media_kit` with Live/VOD stream handling)
- [x] Settings Screen Shell (Logout functionality)
- [x] Web Platform Configuration

---

## 🟡 Pending (Phase 2 & beyond)

### 1. Data Sources & Services
- [ ] **M3U Playlist Support**: Implement parsing and loading logic for pure `.m3u` URLs via `M3UService`.
- [ ] **TMDB Service Integration**: Fetch trending movies/shows for the Home screen hero banner.

### 2. State Features
- [x] **Favorites System**: Allow users to add/remove streams/VODs to favorites (`addFavorite`, `removeFavorite`) and display them on the Home screen.
- [x] **Recently Watched**: Track playback positions for VODs and last-watched timestamps for Live TV. Show "Continue Watching" row.
- [x] **Parental Control / PIN**:
  - [x] Implement `PinSetupScreen`.
  - [x] Filter `adult=1` categories unless unlocked.
  - [ ] Channel Locking (`lockedChannels`).
- [ ] **Streaming Settings**: Buffer sizes, video qualities, player engine toggles (if supported).

### 3. UI/UX: Home Screen (Mobile)
- [x] **EPG Progress Bars**: Parse EPG data for the active channel list and display the "Now Playing" title + progress bar under live channels.
- [ ] **Hero Banner**: Implement the auto-cycling TMDB "Trending" carousel at the top of the Home Screen.
- [x] **Pull-to-Refresh**: Implement `RefreshIndicator` to force an Xtream update.
- [ ] **Provider Switcher**: Quick-switch dropdown if the user has multiple saved Xtream/M3U providers.

### 4. UI/UX: Home Screen (TV Layout)
- [ ] **Platform Detection**: Detect TV vs Mobile (e.g., via screen width or Platform OS).
- [ ] **Sidebar Navigation**: Implement the focused, D-Pad friendly sidebar for TV.
- [ ] **Live TV Timeline**: Implement the 6-hour horizontally scrolling EPG timeline for the Live TV view.
- [ ] **D-Pad Focus Management**: Ensure all grid cards and list items are focusable and correctly styled when hovered via TV remote.

### 5. Media Player & EPG Views
- [ ] **Full EPG Screen**: Implement `EpgScreen` to show a full grid or list of upcoming programs for a specific channel.
- [ ] **Player Overlays**: Add custom UI controls to the `media_kit` player (Channel Name, Next/Prev Channel, Audio/Subtitle track selection).

### 6. Misc
- [x] **Search Screen**: Implement `SearchScreen` to search across Live, VOD, and Series.
- [ ] **Internationalization (i18n)**: Migrate the `react-i18next` translations to Flutter (`flutter_localizations`).
- [ ] **Theming**: Fully migrate the color palette and typography from `src/utils/theme.ts`.
