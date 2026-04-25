# 🥔 CouchPotatoPlayer — Claude Code One-Shot Prompt

Paste everything below the line into Claude Code in the repo root.

---

You are applying a brand-new, end-to-end design system to this Expo/React Native app. It targets **iOS, iPadOS, tvOS, Android, Android TV and Web**. The bar is cinema-grade — think Apple TV+ or Criterion Channel, not a generic IPTV skin. Every pixel must feel intentional.

## Read first (in order)

1. `handoff/DESIGN_SYSTEM.md` — the full spec. Rules, component recipes, platform-specific notes, don'ts.
2. `handoff/tokens.ts` — the single source of truth for colors/spacing/radii/typography/focus/shadows/timing/posters. Drop-in replacement for `theme/tokens.ts`.
3. `handoff/CouchPotatoPlayer.html` — interactive pan/zoom canvas with 16 screens at 1:1. Open in any browser. Every React component it renders lives in:
   - `handoff/screens-tv.jsx` — TV-sized screens (1280×720)
   - `handoff/screens-mobile.jsx` — mobile screens (420×920)
   - `handoff/screens-extra.jsx` — welcome, player, web home
   - `handoff/primitives.jsx` — shared building blocks (Poster, Logo, BrandMark, TVFrame, MobileFrame)
   - `handoff/data.jsx` — mock channel/content data (use as structural reference)
   - `handoff/styles.css` — CSS vars and poster gradient recipes; mirror in RN StyleSheet
4. `handoff/assets/` — all brand images (icon, character, wordmarks). Copy into the app's `assets/` folder.

## Core constraints

- **Dark only.** `#07070A` bg. No light mode.
- **Electric (`#6B5BFF`) is the default accent.** User-pickable in Settings from 6 choices (Electric, Potato, Sunset, Mint, Gold, Crimson). Persist in AsyncStorage.
- **TV focus is sacred.** Every focusable element on tvOS/Android TV must scale 1.04x, gain a 3px accent ring, and cast an accent glow. 160ms transition. Never skip this.
- **No hard-coded values anywhere.** Every color, size, radius, font weight must come from `theme/tokens.ts`. If you need something new, add it to the token file first.
- **No emoji.** Use `lucide-react-native` (already in deps) for all icons. Icon mapping is in `handoff/README.md`.
- **The logo is the potato-on-couch**, not a letter. Use `BrandMark` component everywhere.

## Workflow

1. Replace `theme/tokens.ts` with `handoff/tokens.ts`. If anything breaks, add temporary back-compat exports — don't silence TS errors.
2. Copy `handoff/assets/*.png` into project `assets/` (if not already present).
3. Add `context/ThemeContext.tsx` — exposes `{ accent, setAccent, density, setDensity }`. Persist under `@cpp:accent` / `@cpp:density`. Wrap the app in `App.tsx`. All consumers read accent from context, not tokens directly — this is how user changes flow.
4. Build `components/BrandMark.tsx` per spec §3.1.
5. Build `components/Focusable.tsx` — export `FocusableButton` and `FocusableCard` that wrap `Pressable` with the TV focus contract (scale + ring + glow + timing). Every other Pressable in the app should go through these. Use Reanimated 4 worklets for the scale.
6. Refactor screens in this order, validating each visually against the HTML reference:
   - `screens/WelcomeScreen.tsx` (phone + TV variants)
   - `screens/HomeScreen.tsx` (phone + web + TV sidebar + TV cinema; default TV layout = Sidebar+Hero, expose Cinema as toggle in Settings)
   - `screens/SettingsScreen.tsx` — add **Appearance** section with accent picker (6 swatches) + density toggle (cozy/compact) + TV home layout toggle
   - `screens/PlayerScreen.tsx` — live overlay + VOD TV + mobile landscape variants
   - `screens/MediaInfoScreen.tsx` — series detail TV + mobile
   - `screens/SearchScreen.tsx`
   - New: `screens/LiveTVScreen.tsx` — grid EPG + cards mode toggle
   - New: `screens/BrowseScreen.tsx` — movies tab, series tab
   - New: `screens/FavoritesScreen.tsx`
7. After each screen, run `npm run typecheck`. Before declaring done, run `npm run test:unit` and `npm run test:native-smoke`. Fix regressions.
8. Open a draft PR titled `Design system v2.0 — cinematic dark, Electric accent`.

## Platform specifics (reminder)

- **tvOS / Android TV**: render target 1920×1080, 48px overscan margin on all edges, minimum focus target 72×120.
- **iOS**: `SafeAreaView`, 44×44 minimum touch targets, bottom sheets via `@gorhom/bottom-sheet`.
- **Web**: max content width 1440 centered, hover = -4px translate + accent glow.
- **Respect `AccessibilityInfo.isReduceMotionEnabled()`** — disable the focus scale, keep only the ring.

## Do not

- ❌ Hard-code any color/size.
- ❌ Use light mode, even briefly on boot.
- ❌ Use drop-shadows on text (use scrims).
- ❌ Use gradients on UI chrome (only on poster placeholders and the welcome radial).
- ❌ Recreate copyrighted UI. The designs here are original — keep them original. Don't pull patterns from Netflix, Disney+, Apple TV, etc.
- ❌ Animate layout — only `transform` and `opacity`.
- ❌ Show skeleton shimmers. Show the BrandMark at 30% opacity during loads.

## When done

Summarize the PR with:
- List of touched files
- Screenshots from iOS simulator, Android TV emulator, and `expo start --web`
- Results of `npm run typecheck` + `npm run test:unit` + `npm run test:native-smoke`
- Any tokens you added and why
- Any open design questions for a follow-up PR
