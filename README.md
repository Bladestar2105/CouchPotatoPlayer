# XJ_Player: A React Native IPTV Player (HELP WANTED!)

![Project Header Image](./assets/images/header.jpg)

This is an open-source IPTV player for iOS and Android, built with React Native and Expo.

The project is in the early stages of development and is currently **unstable**. We are actively looking for collaborators to help us fix a critical bug, implement new features, and build a powerful, community-driven media player.

---

## 🚩 The Critical Bug (Priority #1)

The app is currently **unusable** due to a silent crash that blocks all development.

**How to Replicate:**
1.  Launch the app.
2.  Add a new M3U profile (using a valid M3U URL).
3.  Click the "Load" button for that profile.
4.  The terminal shows `LOG Chargement du profil: [Profile Name]`...
5.  ...and then the Metro server **immediately stops (`› Stopped server`)** without any error message.

**What We Suspect:**
This silent crash is likely caused by one of these two issues:

1.  **A bug in the M3U parser:** The parser in `context/IPTVContext.tsx` (the `parseM3U` function) might be failing silently when it tries to parse the M3U file, crashing the whole server.
2.  **A "Require Cycle":** The logs sometimes show `WARN Require cycle: components/VideoPlayer.tsx`. This cache bug might be putting the app in an unstable state, causing it to crash on load.

We need help debugging this parser or fixing the cache/cycle issue. **The project is blocked until this is fixed.**

---

## 🚀 Feature Roadmap / To-Do List

Once the crash is fixed, here is what we need to build. Help on any of these items is welcome!

### Core API & Parsers
* `[ ]` **Fix M3U Parser:** Make the current `parseM3U` function robust and error-proof.
* `[ ]` **Implement Xtream Codes API:**
    * Add "Xtream Codes" as a profile type in the `PlaylistManager`.
    * Create a service (`xtreamService.ts`) to handle the login (Server, User, Pass).
    * Fetch and parse categories (Live, VOD, Series) from the Xtream API.
    * Fetch and parse the stream lists for each category.
* `[ ]` **Implement Stalker Portal API:**
    * Add "Stalker (MAC)" as a profile type.
    * Create a service (`stalkerService.ts`) to handle portal login (Portal URL, MAC Address).
    * Parse the Stalker JSON-RPC responses for channels.
* `[ ]` **Implement EPG Parser:**
    * Fetch the `epg_url` provided by the M3U or Xtream API.
    * Parse the `XMLTV` data (likely needs an `xml2js` library).
    * Store and display EPG data (current/next program) for channels.
* `[ ]` **Handle HTTP Headers:**
    * Allow users to add custom HTTP `User-Agent` and `Referer` headers for streams that require them.

### UI / UX
* `[ ]` **Implement Tabbed Navigation:** On the `HomeScreen`, replace the single `ChannelList` with a Tab Navigator to show:
    * "Live TV" (`ChannelList`)
    * "Movies" (`MovieList`)
    * "Series" (`SeriesList`)
* `[ ]` **Create `MovieList` / `SeriesList`:** Create new components to display the lists of movies and series from the context.
* `[ ]` **Profile Editing:** Add an "Edit" button next to "Delete" in the `PlaylistManager`.

### Bug Fixes
* `[ ]` **Investigate `Require cycle` warning:** Find the source of the `WARN Require cycle: components/VideoPlayer.tsx` and refactor to remove it.
* `[ ]` **Fix Click Issue:** The `onPress` on `ChannelList` items sometimes fails (likely related to the `Require cycle` bug).

---

## 🛠️ Getting Started (Development Build - VLC Player)

**IMPORTANT:** This project now uses a native VLC library (`react-native-vlc-media-player`) to fix audio/codec issues. You can **no longer** run this project with the standard Expo Go app.

You must build a custom development client.

### 1. First-Time Setup

1.  Clone this repository:
    ```bash
    git clone [https://github.com/xjapan007/XJ_Player.git](https://github.com/xjapan007/XJ_Player.git)
    ```
2.  Navigate to the project directory:
    ```bash
    cd XJ_Player
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Log in to your Expo account (you'll need one):
    ```bash
    npx expo login
    ```
5.  Build the development client for your platform (e.g., Android):
    ```bash
    eas build --profile development --platform android
    ```
6.  Expo will build an `.apk` file. Download and install it on your device.

### 2. Running the App (Daily)

1.  Start the development server:
    ```bash
    npx expo start --dev-client
    ```
2.  Scan the QR code with your **new "XJ_Player" app** (not Expo Go).

---

## 🤝 How to Contribute

1.  **Fork** this repository.
2.  Create a new branch (`git checkout -b feature/my-new-feature` or `bugfix/fix-the-crash`).
3.  Make your changes.
4.  **Submit a Pull Request** with a clear description of what you've done.

---

## 📄 License

This project is licensed under the MIT License.