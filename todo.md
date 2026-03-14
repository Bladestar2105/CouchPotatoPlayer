# CouchPotatoPlayer - Fix Build Issues

## Fix 1: Standardize package manager (pnpm vs npm)
- [ ] Remove pnpm-lock.yaml, standardize on npm
- [ ] Update build-apps.yml to use npm consistently

## Fix 2: xcodebuild piped to tail loses exit codes
- [ ] Remove `| tail -50` from xcodebuild commands
- [ ] Use `tee` or xcpretty instead to preserve exit codes

## Fix 3: KSPlayer namespace prefixes broken (static library)
- [ ] Remove `KSPlayer.` namespace prefixes from Swift code
- [ ] Fix NSClassFromString to use unqualified name
- [ ] Fix KSOptions, KSAVPlayer references

## Final
- [ ] TypeScript + Webpack build check
- [ ] Commit and push all fixes