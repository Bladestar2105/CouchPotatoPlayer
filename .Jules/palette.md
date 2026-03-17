## 2024-05-24 - Added tooltips to IconButtons
**Learning:** In a media application context like IPTV, it's very common to use icon-only buttons to save space on mobile and TV screens. Many of these icons in CouchPotatoPlayer (`Icons.lock`, `Icons.favorite`, `Icons.delete`) lacked textual descriptions via the `tooltip` property, making them inaccessible to screen readers and potentially confusing to new users relying on mouse-over interactions.
**Action:** Always add `tooltip` attributes to `IconButton` widgets if they lack visible accompanying text to maintain accessibility and usability, particularly in highly visual list and grid layouts.
## 2024-05-25 - Added autofocus to initial TextFields
**Learning:** In TV UI contexts (Android TV/Apple TV), forms, dialogs, and setup screens can be cumbersome to navigate with a remote control if the initial input field is not automatically focused. Users are forced to use the D-pad to explicitly navigate to the first text field.
**Action:** Always add `autofocus: true` to the primary initial `TextField` in forms, dialogs, and setup screens to eagerly capture focus and streamline entry.
