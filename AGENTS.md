# AGENTS.md

## Repository purpose
CouchPotatoPlayer is a production React Native application built with Expo and react-native-tvos.
Primary target platforms are:
- iOS
- tvOS
- Android
- Android TV

Treat all changes as potentially cross-platform. Preserve correctness, stability, playback reliability, remote-navigation behavior, and minimal diffs.

## Platform-aware working rules
- First understand which platforms are affected before editing.
- Prefer the smallest safe change that fixes the issue.
- Do not perform broad refactors unless explicitly requested.
- Preserve existing naming conventions, architecture, and platform abstractions.
- When changing UI or input handling, consider touch, focus, remote, and D-pad behavior.
- Avoid introducing new dependencies unless clearly justified and compatible with Expo + react-native-tvos.
- Do not assume phone behavior matches TV behavior.
- Do not assume iOS/tvOS behavior matches Android/Android TV behavior.

## Platform priorities
All four target platforms matter. When making or validating changes, explicitly consider:

### iOS
- touch interactions
- safe area handling
- media playback behavior
- platform-specific permission or lifecycle differences

### tvOS
- focus engine behavior
- remote navigation
- preferred focus / initial focus
- large-screen layout readability
- overscan-safe spacing where relevant

### Android
- back handling
- permission differences
- player behavior and lifecycle differences
- performance on lower-powered devices

### Android TV
- D-pad navigation
- focus persistence
- list virtualization and scroll performance
- non-touch usability

## Expected workflow
1. Inspect the relevant files and dependency boundaries.
2. Determine which of iOS, tvOS, Android, and Android TV are affected.
3. Identify the root cause.
4. Implement the smallest safe fix.
5. Validate the change with the relevant checks.
6. Summarize platform impact, risks, and follow-up needs.

## Validation requirements
Before considering a task complete, run as many applicable checks as are available.
Use the repository's real scripts. Do not invent commands silently.

Preferred order:
1. `pnpm install --frozen-lockfile`
2. `pnpm run typecheck`
3. `pnpm run lint`
4. `pnpm test`
5. `pnpm run build`

If Expo-specific or platform-specific scripts exist, use them when relevant.
Examples may include commands for Expo, native prebuild, or TV-specific validation, but only if they already exist in the repository.

If a command is unavailable, state that clearly.

## Expo and native-change policy
### Safe to change
- JavaScript / TypeScript application code
- shared React Native components
- tests
- documentation
- non-secret configuration examples

### Change carefully
- Expo configuration
- navigation and focus management
- playback and player lifecycle
- state management
- shared types and interfaces
- platform-conditional code
- list virtualization and rendering logic

### Do not change unless explicitly requested
- signing configuration
- credentials and secrets
- EAS / release configuration
- native iOS / tvOS / Android project settings created by prebuild
- store metadata
- large dependency upgrades
- major architectural rewrites

## React Native / TV-specific guidance
When working in this repository, pay special attention to:
- focus management and preferred focus rules
- remote / D-pad navigation behavior
- Pressable / Touchable behavior differences on TV vs touch devices
- FlatList / SectionList virtualization behavior on large TV screens
- stable keys and render performance in long lists such as EPG-style views
- avoiding unnecessary rerenders during playback, guide updates, and focus changes
- cleanup of listeners, timers, subscriptions, and AppState-related logic
- platform guards such as `Platform.OS`, TV detection, and Expo capability differences

## Performance guidance
When working on performance:
- Measure before making assumptions when possible.
- Prioritize reducing unnecessary rerenders, repeated expensive calculations, focus churn, and redundant I/O.
- Watch for large lists, repeated state updates, synchronous blocking work, and unbounded retries.
- Consider lower-powered Android TV hardware when evaluating performance.
- Do not trade correctness or focus stability for micro-optimizations without evidence.

## Bugfix guidance
When fixing bugs:
- Identify the user-visible symptom.
- Find the root cause, not just the nearest failing line.
- State which target platforms are affected.
- Add or update regression coverage when feasible.
- Mention edge cases affected by the fix, especially around focus, playback, lifecycle, and navigation.

## Documentation expectations
If behavior, commands, architecture, or setup changes, update the relevant documentation in:
- `README.md`
- `docs/development.md`
- `docs/architecture.md`
- any relevant skill under `.agents/skills/`

## Output expectations
At the end of a task, provide:
- files changed
- reason for each change
- platforms affected
- validation performed
- known limitations or follow-up recommendations
