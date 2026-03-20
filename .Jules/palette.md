## 2024-05-24 - Added tooltips to IconButtons
**Learning:** In a media application context like IPTV, it's very common to use icon-only buttons to save space on mobile and TV screens. Many of these icons in CouchPotatoPlayer (`Icons.lock`, `Icons.favorite`, `Icons.delete`) lacked textual descriptions via the `tooltip` property, making them inaccessible to screen readers and potentially confusing to new users relying on mouse-over interactions.
**Action:** Always add `tooltip` attributes to `IconButton` widgets if they lack visible accompanying text to maintain accessibility and usability, particularly in highly visual list and grid layouts.

## 2024-05-25 - Added autoFocus to primary TextInputs
**Learning:** In a media application context designed for TV and mobile like CouchPotatoPlayer, forms such as profile setup or PIN entry can be tedious if the user must manually navigate or tap to focus the first input field, especially with a D-pad or remote.
**Action:** Always add `autoFocus={true}` to the primary initial `TextInput` in forms, dialogs, and setup screens to eagerly capture focus and streamline remote control or keyboard entry without extra navigation steps.
## 2026-03-20 - Added accessibility labels to icon-only buttons
**Learning:** Icon-only buttons wrapped in `TouchableOpacity` (like hamburger menus or icon selectors) do not inherently convey their purpose to screen readers. This makes navigation confusing for users who rely on assistive technologies.
**Action:** Always add `accessibilityRole="button"` and a descriptive `accessibilityLabel` to icon-only `TouchableOpacity` instances to ensure they are properly read by screen readers.
