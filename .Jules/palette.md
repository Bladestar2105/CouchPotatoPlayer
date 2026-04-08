## 2026-04-07 - Added accessibility labels to ChannelLogo
**Learning:** In React Native, to prevent screen readers from spelling out raw text used as an image fallback (such as an initial), wrap the fallback `View` with `accessible={true}`, `accessibilityRole="image"`, and a descriptive `accessibilityLabel`.
**Action:** Always provide appropriate accessibility labels and roles to image components and their fallbacks.
## 2026-04-07 - Explicitly define accessibility roles for React Native action buttons
**Learning:** In React Native, `TouchableOpacity` components wrapping text do not automatically map to screen reader "buttons" reliably unless explicitly told so. Form action buttons (like "Save" or "Unlock") can lack context for screen readers when they rely only on text content without proper ARIA/accessibility roles.
**Action:** Always provide `accessible={true}` and `accessibilityRole="button"` to primary action `TouchableOpacity` elements to ensure predictable and semantic screen reader behavior.
