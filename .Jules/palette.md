## 2026-04-07 - Added accessibility labels to ChannelLogo
**Learning:** In React Native, to prevent screen readers from spelling out raw text used as an image fallback (such as an initial), wrap the fallback `View` with `accessible={true}`, `accessibilityRole="image"`, and a descriptive `accessibilityLabel`.
**Action:** Always provide appropriate accessibility labels and roles to image components and their fallbacks.
