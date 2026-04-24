# CouchPotatoPlayer — Design System v2.0

**Status:** Ready for implementation
**Platforms:** iOS · iPadOS · tvOS · Android · Android TV · Web (Expo + React Native + RN‑Web)
**Source of truth:** `handoff/tokens.ts` (drop into `theme/tokens.ts`)
**Interactive reference:** Open `CouchPotatoPlayer.html` in any browser to pan/zoom every screen in context and toggle accent/radius/typeface live.

---

## 0. Mission

Build a single visual language across phone, tablet, living-room TV and web that feels like a premium, cinema-grade player — **Apple TV+ / Criterion-level polish**, not a generic IPTV skin. Every pixel should read as "someone cared about this."

The Welcome, Home, EPG, Browse, Detail, Player, Search and Settings screens are all specified visually in the HTML reference. This doc covers the **rules** — apply them everywhere, including screens not explicitly designed yet.

---

## 1. The 10 Non-Negotiables

1. **Dark is the canvas.** `#07070A` background everywhere except the Welcome onboarding (radial gradient from `#1a0f14`). No light mode.
2. **One accent at a time.** `#6B5BFF` (Electric) is the default. User can change it in Settings → Appearance. Accent appears only on: primary CTAs, focus rings, progress fills, live indicators, and the brand wordmark's trailing punctuation.
3. **TV focus is sacred.** A focused element on tvOS/Android TV **always** scales by 4%, gains a 3px accent ring, and casts an accent-colored glow. See `focus` in tokens.ts. No exceptions — this is how users navigate without a cursor.
4. **Posters are 2:3. Backdrops are 16:9.** Never crop, never squash. Use `posters.sm/md/lg/xl` from tokens.
5. **Only 3 font weights ship:** 500 (body), 700 (titles), 900 (display). Skip 400, 600, 800 — they cause visual noise at cinema scale.
6. **Blur + scrim, not drop-shadow, for overlays.** Player controls, channel chips, modal backdrops all use `rgba(0,0,0,0.5–0.8)` over a backdrop-filtered blur.
7. **No emoji.** Ever. Use Lucide icons (`lucide-react-native`, already in deps).
8. **LIVE = `#FF3B30`.** With a 6px pulsing dot. Never use the accent color for liveness.
9. **The logo is the potato-on-couch icon**, not a letter. Use `assets/icon.png` in a rounded navy-backed tile, or `assets/character_logo.png` for hero placements.
10. **Respect Safe Area on iOS, Overscan on tvOS.** 48px overscan margin on TV surfaces.

---

## 2. Tokens — the only allowed values

Every screen MUST import `colors`, `spacing`, `radii`, `typography`, `focus`, `shadows`, `timing`, `posters` from `theme/tokens.ts`. **No hard-coded hex, px, or font weights anywhere else.**

```ts
import { colors, spacing, radii, typography, focus, shadows, timing, posters } from '@/theme/tokens';
```

See `tokens.ts` in this handoff folder for the full file.

### Color use — cheat sheet
| Token | Use for |
|---|---|
| `colors.bg` | App background |
| `colors.surface` | Cards, list rows, sidebars |
| `colors.elevated` | Modals, popovers, focused surfaces, hovered rows |
| `colors.sunken` | Input fields, inner wells, EPG grid cells |
| `colors.border` | Default 1px hairlines between rows |
| `colors.borderSoft` | Subtle dividers inside cards |
| `colors.text` | Primary copy, titles |
| `colors.textDim` | Secondary copy, metadata |
| `colors.textMuted` | Captions, disabled, timestamps |
| `colors.accent` | Primary button bg, focus ring, progress fill |
| `colors.accentSoft` | Hover backgrounds, selection chips |
| `colors.live` | LIVE badge, recording dot |
| `colors.brandNavy` | Brand-mark plate background |
| `colors.brandOrange` | Reserved for the icon itself, never UI |

---

## 3. Component recipes

### 3.1 BrandMark
The single way the logo renders anywhere in the app.

```tsx
<View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.brandNavy, overflow: 'hidden' }}>
  <Image source={require('@/assets/icon.png')} style={{ width: '100%', height: '100%' }} />
</View>
```

Sizes: 28 (mobile header), 32 (TV header), 88 (brand sheet / settings), 200 (welcome hero — use `character_logo.png` instead).

### 3.2 Button
Three variants. **Always** `radii.lg` (16px).

- **Primary** — `backgroundColor: colors.accent`, text `#FFF`, weight 700, height 44 mobile / 56 TV.
- **Ghost** — transparent, `borderWidth: 1, borderColor: colors.border`, text `colors.text`.
- **Destructive** — `backgroundColor: colors.danger`, text `#FFF`.

When focused (TV), the button scales 1.04, swaps its bg to `colors.elevated` (for ghost) or `colors.accentDeep` (for primary), and shows the 3px focus ring + glow.

### 3.3 Poster card
```tsx
<Pressable
  focusable
  style={({ focused }) => ({
    width: posters.md.w, height: posters.md.h,
    borderRadius: radii.md,
    overflow: 'hidden',
    transform: [{ scale: focused ? focus.scale : 1 }],
    ...(focused ? focus.glow : {}),
    borderWidth: focused ? focus.ringWidth : 0,
    borderColor: colors.accent,
  })}>
  <Image source={{ uri: posterUrl }} style={{ width: '100%', height: '100%' }} />
</Pressable>
```

Shelf gap: `spacing.md` (12) compact, `spacing.lg` (16) cozy. Shelf title: `typography.subtitle`, color `colors.text`.

### 3.4 Channel logo tile
Letter mark on a brand-colored plate — use the `Logo` primitive. Size 32 in EPG rows, 40 in cards, 26 in overlays.

### 3.5 LIVE pill
```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.live, borderRadius: radii.sm }}>
  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF', opacity: 0.9 }} />
  <Text style={{ ...typography.eyebrow, color: '#FFF' }}>LIVE</Text>
</View>
```

The dot pulses at 1.2s using Reanimated (opacity 0.5 → 1.0).

### 3.6 EPG row
Height 56 compact / 64 cozy. Columns: `[channel logo + name, 200px] | [timeline grid, flex]`. Current-time indicator is a 2px vertical line `colors.accent` with a 10px circle on top.

### 3.7 Player controls
Bottom sheet, 160px tall, `rgba(7,7,10,0.72)` + 24px backdrop blur. Scrubber: 4px track `rgba(255,255,255,0.2)`, fill `colors.accent`, thumb 14px white circle. Remaining/elapsed time in `typography.mono` at `colors.textDim`.

### 3.8 Settings row
Height 56, bg `colors.surface`, separated by 1px `colors.borderSoft`. Leading icon 22px in `colors.textDim`. Title in `typography.body`, subtitle in `typography.caption` `colors.textMuted`. Trailing chevron 16px.

---

## 4. Platform-specific rules

### tvOS & Android TV (10-foot UI)
- Render target: **1920×1080**. Always design for that.
- Overscan margin: **48px on every edge**. No content in the outer 48px.
- Minimum touch target: n/a (remote only).
- Minimum **focus target**: 72px tall, 120px wide.
- Never show two focus rings at once.
- Sidebars are 240px wide on TV Home; collapse to icon-only (72px) when focus leaves them.
- Text scales up: body is 17→20, title is 22→28, display stays 56.

### iOS / iPadOS
- Respect `SafeAreaView` always.
- Minimum touch target: **44×44**.
- Tab bar: 5 items max, height 52 (+ safe area), icons 24px.
- Modal sheets use `@gorhom/bottom-sheet` (already in deps), snap points `['35%', '85%']`.

### Android
- Match iOS patterns; Material ripples allowed only on list rows (`android_ripple={{ color: colors.accentSoft }}`).

### Web (RN-Web)
- Max content width 1440. Center with auto margins.
- Hover states: translate poster by -4px + accent glow (poor-man's focus).
- Keyboard focus: same ring as TV.

---

## 5. Motion

All animations use Reanimated 4 (already in deps). Durations from `timing` token.

| Interaction | Duration | Easing |
|---|---|---|
| Focus ring appear | 160 (`fast`) | `Easing.out(Easing.cubic)` |
| Scale on focus | 160 | same |
| Modal open | 240 (`normal`) | `Easing.out(Easing.exp)` |
| Poster shelf scroll | spring, stiffness 180, damping 22 | |
| Player controls fade in/out | 240 | linear |
| Scene change (player → detail) | 380 (`slow`) | `Easing.inOut(Easing.cubic)` |
| Splash → welcome | 600 (`cinema`) | only time this is allowed |

**Never** animate layout on focus — only `transform` and `opacity`. Layout animations kill TV 60fps.

---

## 6. Screens to (re)build — mapped to HTML reference

The HTML design canvas has 16 artboards. Map each to the existing screen file:

| Artboard | File | Platform targets |
|---|---|---|
| `brand` (Brand sheet) | `theme/tokens.ts` + `components/Brand.tsx` (new) | all |
| `welcome-tv` | `screens/WelcomeScreen.tsx` | tvOS, AndroidTV |
| `onboarding-mobile` | `screens/WelcomeScreen.tsx` (phone variant) | iOS, Android |
| `home-tv-a` (Sidebar+Hero) | `screens/HomeScreen.tsx` — TV variant | tvOS, AndroidTV |
| `home-tv-b` (Cinema) | Tweak option in HomeScreen — pick A or B; **default A** | tvOS, AndroidTV |
| `home-web` | `screens/HomeScreen.tsx` — web variant | Web |
| `home-mobile` | `screens/HomeScreen.tsx` — phone variant | iOS, Android |
| `epg-grid` | `screens/LiveTVScreen.tsx` (new) — grid mode | all |
| `epg-cards` | same screen — cards mode (user toggle) | all |
| `player-live` | `screens/PlayerScreen.tsx` — live overlay | all |
| `movies-tv` | `screens/BrowseScreen.tsx` (new) — movies tab | all |
| `series-tv` | `screens/MediaInfoScreen.tsx` — series layout | all |
| `favorites-tv` | `screens/FavoritesScreen.tsx` (new) | all |
| `detail-mobile` | `screens/MediaInfoScreen.tsx` — phone | iOS, Android |
| `player-vod-tv` | `screens/PlayerScreen.tsx` — VOD on TV | tvOS, AndroidTV |
| `player-mobile` | `screens/PlayerScreen.tsx` — phone landscape | iOS, Android |
| `search-mobile` | `screens/SearchScreen.tsx` | all |
| `settings-mobile` | `screens/SettingsScreen.tsx` | all |

---

## 7. Accent color — user-pickable in Settings

Ship all 6 options from the reference (Electric default):

```ts
export const ACCENT_CHOICES = [
  { name: 'Electric', value: '#6B5BFF' }, // default
  { name: 'Potato',   value: '#E85D1C' },
  { name: 'Sunset',   value: '#FF5E3A' },
  { name: 'Mint',     value: '#00D4A0' },
  { name: 'Gold',     value: '#F5C518' },
  { name: 'Crimson',  value: '#E50914' },
];
```

Persist in AsyncStorage under `@cpp:accent`. Expose via a ThemeContext so changes rerender live.

Density toggle (Settings → Appearance → Density): cozy | compact. Persist under `@cpp:density`.

---

## 8. Accessibility

- Every focusable element has `accessibilityLabel`.
- Contrast ratios: text on bg ≥ 7:1 (AAA), textDim ≥ 4.5:1 (AA). All current tokens pass.
- Honor `Appearance.getColorScheme()` — actually ignore it; app is dark-only by design, but never force a light flash on boot.
- Respect `AccessibilityInfo.isReduceMotionEnabled()` — disable the 1.04 scale on focus, keep only the ring.

---

## 9. Don'ts

- ❌ Don't use `#FFF` directly — use `colors.text`.
- ❌ Don't use gradients for UI chrome. Only for poster placeholders and the welcome radial.
- ❌ Don't center-align body copy. Left-align everything except hero titles.
- ❌ Don't add drop-shadows to text. Use scrims.
- ❌ Don't use border-radius above `radii.xxl` on anything rectangular — only pills (fully round ends).
- ❌ Don't show skeleton shimmers. Show the brand-mark at 30% opacity instead.
- ❌ Don't put more than 3 actions in a row. Stack vertically on mobile.
