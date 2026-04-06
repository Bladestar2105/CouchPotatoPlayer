## 2024-05-24 - [Replace native Buttons with TouchableOpacity for improved a11y]
**Learning:** Native React Native `Button` components do not fully support `accessibilityLabel` or nested custom styling in the same way `TouchableOpacity` or `Pressable` does, making them less ideal for screen-reader focused or custom design systems.
**Action:** Default to using `TouchableOpacity` (or `Pressable`) with `accessibilityRole="button"` and `accessibilityLabel` for better accessibility and consistent cross-platform styling instead of standard native `Button`s.\n## 2025-05-25 - [Use accessibilityRole="tab" for Custom Selectors]
**Learning:** When using horizontal TouchableOpacity groups as a toggle/selector (like choosing between 'Xtream Codes' and 'M3U Playlist'), screen readers just read them as plain buttons unless we define the relationship.
**Action:** Always use `accessibilityRole="tab"` and `accessibilityState={{ selected: bool }}` for these grouped selectors so users understand their current selection context.

## 2026-04-06 - Add accessibility hints to primary media actions
**Learning:** While `accessibilityLabel` describes what an element is (e.g. 'Play'), `accessibilityHint` is crucial for explaining the result of interacting with it (e.g. 'Plays this media'), significantly improving the experience for screen reader users on key call-to-actions.
**Action:** Always pair `accessibilityLabel` with `accessibilityHint` on prominent interactive elements.
## 2026-04-06 - [Apply Custom Branding and Light Theme to Welcome Screen]
**Learning:** When adopting a light theme for specific initial login/welcome screens in an otherwise dark-theme application, text contrast and icon visibility immediately suffer unless standard text styling overrides are thoroughly applied alongside the background color changes.
**Action:** Always map explicit dark/brand colors (e.g. , ) to text elements, borders, and SVGs/icons when shifting a component's container background to white () to ensure WCAG compliant contrast and correct visual branding.
