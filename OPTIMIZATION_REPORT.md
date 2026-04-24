# CouchPotatoPlayer Optimization Report

Based on the codebase audit and code review documents (`docs/CODE_REVIEW_REPORT.md` and `docs/codebase-audit-tasks.md`), the following optimization tasks have been identified for the CouchPotatoPlayer repository.

## 1. High Priority (Immediate Action)

### 1.1 Memory Management in Native Players
- **Description:** Prevent memory leaks in Swift native players. `SwiftTSPlayerProxy.swift` uses an `activeConnections` array without thread safety. The `ConnectionContext` class holds strong references to `connection` and `delegate`.
- **Recommendation:** Use thread-safe collections for `activeConnections` (e.g., using `NSLock` or a serialized `DispatchQueue`). Implement `weak` references to avoid retain cycles.
- **Affected Platforms:** iOS, tvOS

### 1.2 tvOS Focus Engine Optimization
- **Description:** The sidebar in `HomeTVLayout.tsx` has `autoFocus` on `TVFocusGuideView`, but transitioning between the sidebar and content area is not optimal. Focus sometimes gets stuck on the sidebar after a channel change.
- **Recommendation:** Implement a `useFocusState` hook to track the current focus area. Use `nextFocusUp/Down/Left/Right` props for explicit navigation. Automatically focus the newly selected channel in the list upon channel change.
- **Affected Platforms:** tvOS

### 1.3 Swift Thread Safety
- **Description:** Race conditions exist because the Proxy runs on a background queue but receives connections on another.
- **Recommendation:** Implement proper thread safety mechanisms (e.g., `NSLock`) in the Swift code.
- **Affected Platforms:** iOS, tvOS

### 1.4 iOS Background Audio Support
- **Description:** Background audio support is currently missing, which is a standard feature for video apps.
- **Affected Platforms:** iOS

## 2. Medium Priority (Next Iteration)

### 2.1 FlatList Virtualization Tuning
- **Description:** Complex render paths with closures/state dependencies exist in `ChannelList`, `MovieList`, and `SeriesList`. This causes unnecessary re-renders and degrades scroll/focus performance on TV devices when dealing with large provider catalogs.
- **Recommendation:**
  - Stabilize `renderItem`, `keyExtractor`, and event handlers using `useCallback`.
  - Pass an `extraData` prop to `FlatList` to trigger targeted re-renders (e.g., when `focusedChannelId` or `currentStream?.id` changes), avoiding full list re-renders.
  - Fine-tune `windowSize`, `maxToRenderPerBatch`, and `removeClippedSubviews`.
- **Affected Platforms:** All (especially Android TV and tvOS)

### 2.2 tvOS Overscan Compensation
- **Description:** Improve compatibility with older TVs by properly handling overscan.
- **Affected Platforms:** tvOS

### 2.3 Context Granularity (Reduce Re-render Load)
- **Description:** The `IPTVContext` bundles many states/functions into a single provider. State changes trigger unnecessary re-renders in consumer components.
- **Recommendation:** Split context into smaller, domain-specific providers (e.g., Profile, Playback, EPG, Favorites) or implement selector-based access.
- **Status:** Currently in progress (various slices like Playback, Library, Collections have been extracted).

### 2.4 Error Handling Improvements
- **Description:** `SwiftTSPlayerView.swift` catches errors with `localizedDescription` but loses debug information. `KSPlayerView.swift` only logs via `print()`.
- **Recommendation:** Implement a centralized error handler with domains and codes. Use `OSLog` for structured logging.
- **Affected Platforms:** iOS, tvOS

### 2.5 tvOS Top Shelf Extension
- **Description:** A Top Shelf Extension is not yet implemented.
- **Recommendation:** Implement it to show recently watched channels and favorites, allowing deep linking directly into playback.
- **Affected Platforms:** tvOS

## 3. Low Priority (Long-term)

### 3.1 Code Organization
- **Description:** `VideoPlayer.tsx` and `PlayerScreen.tsx` are very large and mix view and business logic.
- **Recommendation:** Extract player render functions into separate files (`players/VLCPlayer.tsx`, etc.) and use custom hooks (`usePlayerState`, `useChannelNavigation`).
- **Affected Platforms:** All

### 3.2 Siri Remote Gestures
- **Description:** `PlayerScreen.tsx` only handles button events. Swipe gestures on the Siri Remote touchpad are ignored.
- **Recommendation:** Implement swipe gestures for channel changing and volume control.
- **Affected Platforms:** tvOS

### 3.3 tvOS Settings Bundle
- **Description:** App-specific settings are missing from the tvOS Settings app.
- **Recommendation:** Create a `Settings.bundle` for basic options (default player, hardware decoding, language).
- **Affected Platforms:** tvOS
