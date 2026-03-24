# Kotlin Multiplatform Migration Todo

This directory (`kmp-app`) represents the foundational architecture for migrating CouchPotatoPlayer from React Native to **Kotlin Multiplatform (KMP)** and **Compose Multiplatform**.

Due to the immense size of the application and the complexity of native media players and TV focus management, a 1:1 automated migration in a single step is impossible. This is a "best effort" initial step.

## ✅ What Has Been Done (This Step)

* **KMP Project Architecture Built:**
  * Created `kmp-app/shared` for cross-platform business logic.
  * Created `kmp-app/composeApp` for the shared UI layer (Android, iOS).
  * Setup `build.gradle.kts` files with dependencies for Serialization, Coroutines, Settings, and Compose Multiplatform.

* **Core Data Models Migrated:**
  * Replicated all TypeScript interfaces from `types/index.ts` into Kotlin `@Serializable` data classes in `shared/src/commonMain/kotlin/models/CoreModels.kt`.
  * Added models for `Channel`, `Movie`, `Series`, `EPGProgram`, `FavoriteItem`, `IPTVProfile` (M3U, Xtream, Stalker), etc.

* **Core Utilities Migrated:**
  * `Logger.kt` implemented replacing `utils/logger.ts`.
  * `EpgParser.kt` date parsing logic successfully migrated to Kotlin using `kotlinx.datetime` (handling complex XMLTV date string offsets).

* **Basic UI Shell:**
  * Created a simple Compose Multiplatform entry point (`App.kt`) demonstrating a Scaffold, TopAppBar, and Button ready to connect to ViewModel logic.

* **Native Media Player Implementation:**
  * Configured `build.gradle.kts` files to integrate `org.videolan.android:libvlc-all` for Android and Cocoapods `MobileVLCKit` for iOS/tvOS.
  * Created an `expect/actual` Compose Multiplatform VideoPlayer component mapping `AndroidView` (LibVLC) and `UIKitView` (VLCMediaPlayer) respectively.

---

## 🚧 What Needs To Be Done (Subsequent Steps)

The following lists the required steps to fully transition the React Native app to this new KMP architecture.

### 1. Networking & API Clients
* Replace `fetch()` with Ktor client (`io.ktor:ktor-client-core`).
* Implement the Xtream API client in Kotlin (fetching profiles, categories, live streams, vod, series).
* Implement M3U and XMLTV downloading.

### 2. Local Storage & Caching
* Replace `AsyncStorage` and `expo-file-system` with `com.russhwolf:multiplatform-settings` for simple key-value pairs (like User Settings, PIN, Profile list).
* Implement a local SQLite Database using **SQLDelight** (`app.cash.sqldelight`) to cache EPG Data, massive Channel Lists, and VODs to avoid out-of-memory errors on TV devices.

### 3. XML Parsing
* Connect `io.github.pdvrieze.xmlutil` inside `EpgParser.kt` to fully map the raw `<tv><programme>` XML strings into the `EPGProgram` data class.

### 4. State Management
* Replace React Contexts (`IPTVContext`) with Kotlin **StateFlow** and **ViewModels** (using `lifecycle-viewmodel-compose`).
* Create a `ProfileViewModel` and `PlayerViewModel` to handle application state natively.

### 5. Navigation
* Replace `@react-navigation/stack` and `@react-navigation/drawer` with a KMP-friendly navigator like **Voyager** or **Decompose**.
* Map out the routing for `HomeScreen`, `LiveTvScreen`, `SettingsScreen`, etc.

### 6. TV Platform Focus Management (D-Pad)
* Replace React Native TVOS's custom focus modifiers.
* In Compose, you must leverage `Modifier.focusable()`, `Modifier.onFocusChanged()`, and manage spatial focus using `FocusRequester` specifically optimized for Android TV and Apple TV remotes.

### 7. Full UI Re-implementation
* Manually translate all React Native components (`FlatList`, `BottomSheet`, Modals) into Compose `LazyColumn`, `ModalBottomSheet`, etc.
* Re-implement the EPG timeline view, which requires complex custom layout measurements in Compose.