## 2026-04-07 - Added accessibility labels to ChannelLogo
**Learning:** In React Native, to prevent screen readers from spelling out raw text used as an image fallback (such as an initial), wrap the fallback `View` with `accessible={true}`, `accessibilityRole="image"`, and a descriptive `accessibilityLabel`.
**Action:** Always provide appropriate accessibility labels and roles to image components and their fallbacks.
## 2026-04-07 - Explicitly define accessibility roles for React Native action buttons
**Learning:** In React Native, `TouchableOpacity` components wrapping text do not automatically map to screen reader "buttons" reliably unless explicitly told so. Form action buttons (like "Save" or "Unlock") can lack context for screen readers when they rely only on text content without proper ARIA/accessibility roles.
**Action:** Always provide `accessible={true}` and `accessibilityRole="button"` to primary action `TouchableOpacity` elements to ensure predictable and semantic screen reader behavior.
## 2026-04-09 - Make complex interactive timelines accessible
**Learning:** Highly interactive and complex timeline/grid views (like an EPG timeline) that use generic touchable containers without proper accessibility labels, roles, and hints are completely opaque to screen readers. Users relying on assistive technologies need descriptive context about state (e.g. "live now", "available for catchup", "favorite", "currently playing") to navigate these views.
**Action:** Always add complete accessibility properties (`accessible={true}`, `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityHint`) to touchable elements within complex timeline or grid interfaces to ensure users can interpret their state and functionality.
