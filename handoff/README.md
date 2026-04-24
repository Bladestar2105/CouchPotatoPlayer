# Claude Code Handoff — CouchPotatoPlayer Design System v2.0

Copy the **CLAUDE_CODE_PROMPT.md** contents below into Claude Code (one-shot), or paste the "Quick Prompt" version as a single message.

---

## Quick Prompt (paste this into Claude Code)

> I need you to apply a brand-new design system to this Expo/React Native app. It targets **iOS, iPadOS, tvOS, Android, Android TV and Web** and must look cinema-grade — think Apple TV+, Criterion Channel.
>
> All specs are in `handoff/DESIGN_SYSTEM.md` and `handoff/tokens.ts`. There is also an interactive HTML reference at `handoff/CouchPotatoPlayer.html` that renders every target screen at 1:1.
>
> **Workflow — follow in order:**
>
> 1. Read `handoff/DESIGN_SYSTEM.md` end-to-end. Then read `handoff/tokens.ts`. Then open `handoff/CouchPotatoPlayer.html` in your head (it's pure React + inline JSX; the screen components are in `handoff/screens-tv.jsx`, `handoff/screens-mobile.jsx`, `handoff/screens-extra.jsx`, primitives in `handoff/primitives.jsx`). These are your visual source of truth — match them pixel-for-pixel where possible, adapting to RN primitives.
>
> 2. Replace `theme/tokens.ts` with `handoff/tokens.ts`. Keep the existing exports working (add back-compat re-exports if anything breaks). Add a `ThemeContext` under `context/ThemeContext.tsx` that wraps the app and exposes `{ accent, setAccent, density, setDensity }` — persist to AsyncStorage under `@cpp:accent` and `@cpp:density`.
>
> 3. Copy the icon assets from the handoff folder into the project's `assets/` folder if they're not already there: `icon.png`, `character_logo.png`, `brand-mark.png`, `brand-wordmark-white.png`.
>
> 4. Build a shared **BrandMark** component at `components/BrandMark.tsx` — the only way the logo is ever rendered (see spec § 3.1).
>
> 5. Build a shared **FocusableCard** / **FocusableButton** pair at `components/Focusable.tsx` that implements the TV focus contract (1.04 scale + 3px accent ring + glow + 160ms transition). Every Pressable in the app that ends up on TV must go through these.
>
> 6. Refactor each screen listed in spec § 6 to match the reference. Start with `WelcomeScreen`, then `HomeScreen`, then `SettingsScreen` (add Appearance section with accent picker + density toggle). Then PlayerScreen, MediaInfoScreen, SearchScreen. Build the new `LiveTVScreen`, `BrowseScreen`, `FavoritesScreen` per spec § 6.
>
> 7. After each screen, run `npm run typecheck`. At the end, run `npm run test:unit` and `npm run test:native-smoke`. Fix anything that breaks.
>
> 8. **Do not invent colors, sizes, or font weights.** Every value must come from `theme/tokens.ts`. If you need something that's not a token, add it to the tokens file first with a rationale in a comment.
>
> 9. **Never recreate copyrighted UI.** The designs in the reference are original. Keep them original — don't pull layouts from Netflix, Apple, Disney+, etc.
>
> When you're done, summarize what you touched and open a draft PR titled `Design system v2.0 — cinematic dark, Electric accent`.

---

## Files in this handoff package

| File | Purpose |
|---|---|
| `DESIGN_SYSTEM.md` | Full spec — rules, recipes, platform notes, don'ts |
| `tokens.ts` | Drop-in replacement for `theme/tokens.ts` |
| `CouchPotatoPlayer.html` | Interactive pan/zoom reference canvas (open in any browser) |
| `reference-sheet.html` | Same screens stacked vertically for easy scroll-review |
| `screens-tv.jsx`, `screens-mobile.jsx`, `screens-extra.jsx` | The React components that render each target screen |
| `primitives.jsx` | Shared primitives (Poster, Backdrop, Logo, BrandMark, MobileFrame, TVFrame) |
| `data.jsx` | Mock channel & content data — useful for copy/structure reference |
| `icons.jsx` | Icon component used in the reference (map to `lucide-react-native` in the app) |
| `styles.css` | CSS variables & poster-gradient recipes — mirror these as RN StyleSheet |
| `assets/` | All brand images (icon, character logo, wordmarks) |

---

## Icon mapping (reference → `lucide-react-native`)

The HTML reference uses a custom `<I name="..." />` helper. Map each name to Lucide:

| `I name` | `lucide-react-native` |
|---|---|
| `play` | `Play` |
| `pause` | `Pause` |
| `plus` | `Plus` |
| `search` | `Search` |
| `settings` | `Settings` |
| `home` | `Home` |
| `tv` | `Tv` |
| `film` | `Film` |
| `star` | `Star` |
| `heart` | `Heart` |
| `chevron-right` | `ChevronRight` |
| `chevron-down` | `ChevronDown` |
| `volume` | `Volume2` |
| `fullscreen` | `Maximize2` |
| `skip-forward` | `SkipForward` |
| `skip-back` | `SkipBack` |
| `cast` | `Cast` |
| `subtitles` | `Subtitles` |
| `rewind-10` | `Rewind` + "10" overlay |
| `forward-10` | `FastForward` + "10" overlay |
| `live-dot` | Custom — just a filled `View` |
| `grid` | `LayoutGrid` |
| `list` | `List` |

---

## Suggested PR breakdown (if you'd rather do it in chunks instead of one big PR)

1. **chore/design-tokens** — tokens.ts replace + ThemeContext + assets import + typecheck green
2. **feat/focusable-primitives** — BrandMark + FocusableButton + FocusableCard + storybook-style smoke tests
3. **feat/welcome-redesign** — WelcomeScreen phone + TV variants
4. **feat/home-redesign** — HomeScreen across 4 variants (TV sidebar, TV cinema toggle, web, mobile)
5. **feat/live-tv** — new LiveTVScreen with grid + cards modes
6. **feat/player-redesign** — PlayerScreen live overlay + VOD TV + mobile landscape
7. **feat/browse-and-detail** — BrowseScreen, MediaInfoScreen series detail, FavoritesScreen
8. **feat/search-settings** — SearchScreen + SettingsScreen with Appearance section

Each PR ~300–800 LOC. Total expected diff: ~6000 LOC touched.

---

## Open questions for the user (surface these if unclear)

- Should the default Home on TV be **Sidebar+Hero (A)** or **Full-Bleed Cinema (B)**? Recommended: A, with B as a user toggle under Settings → Appearance → "TV Home layout".
- Cards vs Grid EPG default? Recommended: Grid (power users).
- Is there a PIN flow for kids profiles? Not in the current reference — ask before designing.
- Chromecast / AirPlay target UI? Not in the reference — ask.
