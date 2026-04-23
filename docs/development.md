# Development

## Standard local workflow

### Install
```bash
pnpm install
```

### Run common checks
```bash
pnpm exec tsc --noEmit
pnpm run test:e2e
```

## Development expectations
- Prefer focused changes over broad rewrites
- Keep diffs easy to review
- Update docs when behavior or commands change
- Add regression coverage for important bug fixes when practical
- Keep feature behavior aligned across iOS, tvOS, Android, and Android TV by default; call out and justify any platform-specific divergence

## Before opening a PR
Verify:
- the issue is reproducible or clearly understood
- the root cause is identified
- the change is minimal and scoped
- relevant checks were run
- documentation was updated if needed

## Troubleshooting mindset
When debugging:
1. reproduce the issue
2. isolate the failing path
3. confirm the root cause
4. implement the smallest safe fix
5. validate against regressions

## TV performance profiling (dev builds)
- TV list profiling logs are enabled by default in `__DEV__` when `Platform.isTV` is true.
- Logs use the prefix `[TVPerf]` and currently cover:
- `ChannelList.buildGroups`
- `ChannelList.groupSelectToFocus`
- `ChannelList.playerReturnToFocus`
- `MovieList.buildGroups`
- `MovieList.groupSelectToFocus`
- `SeriesList.buildGroups`
- `SeriesList.groupSelectToFocus`
- To disable TV perf logs at runtime in development, set:
```ts
(globalThis as any).__CP_TV_PERF__ = false;
```

## Dependency changes
Avoid dependency upgrades unless required for the task.
If upgrading a dependency:
- state why
- note any breaking risk
- validate build/test impact

## tvOS App Store Connect upload checks
Before creating a tvOS archive for TestFlight/App Store Connect, verify:
- `assets/store/tvos/app-icon-large-1280x768.png` is exactly `1280x768`
- `assets/store/tvos/top-shelf-wide-2320x720.png` is exactly `2320x720`
- `assets/store/tvos/top-shelf-wide2x-4640x1440.png` is exactly `4640x1440`

Build notes:
- React Native is configured to build from source for iOS/tvOS release archives so dSYMs for React/Hermes-related frameworks are generated for symbol upload.
- TVVLCKit bitcode is stripped in the Podfile post-install step because App Store Connect rejects tvOS uploads when bitcode remains in vendored frameworks.
