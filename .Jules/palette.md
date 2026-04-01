## 2024-05-24 - [Replace native Buttons with TouchableOpacity for improved a11y]
**Learning:** Native React Native `Button` components do not fully support `accessibilityLabel` or nested custom styling in the same way `TouchableOpacity` or `Pressable` does, making them less ideal for screen-reader focused or custom design systems.
**Action:** Default to using `TouchableOpacity` (or `Pressable`) with `accessibilityRole="button"` and `accessibilityLabel` for better accessibility and consistent cross-platform styling instead of standard native `Button`s.
## 2025-05-24 - [Add explicit ARIA roles and labels to primary call-to-action buttons]
**Learning:** Primary call-to-action buttons in media detail screens (like a "Play" or "Episodes" button built with `TouchableOpacity`) that only contain stylized text or icons can be ambiguous to screen reader users if they don't explicitly announce their role or provide context about what the action will do.
**Action:** Always include `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityHint` on major navigation or action buttons to give screen reader users clear context rather than just reading the visible text alone.
