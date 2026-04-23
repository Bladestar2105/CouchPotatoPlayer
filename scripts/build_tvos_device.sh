#!/bin/sh
echo "Preparing tvOS environment for Hardware Device build..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Ensure any .npmrc changes (like public-hoist-pattern) are fully applied first
echo "Ensuring base dependencies are installed and properly hoisted..."
if ! pnpm install; then
  echo "Error: Failed to install base dependencies."
  exit 1
fi

echo "Swapping standard react-native for react-native-tvos temporarily for build..."
# We will temporarily alias react-native to react-native-tvos matching our RN version (0.84.1)
pnpm install -w react-native@npm:react-native-tvos@0.84.1-0

# Fix pnpm symlink resolution for iOS native modules (like RNGestureHandler)
echo "Patching pnpm virtual store for react-native alias..."
RN_TVOS_DIR=$(node -e "console.log(require('path').dirname(require.resolve('react-native/package.json')))")
if [ -d "$RN_TVOS_DIR" ]; then
  # Ensure the directory structure actually matches `react-native-tvos` inside `.pnpm` store
  PARENT_DIR=$(dirname "$RN_TVOS_DIR")
  if [ ! -L "$PARENT_DIR/react-native" ] && [ ! -d "$PARENT_DIR/react-native" ]; then
    echo "Creating react-native symlink to react-native-tvos in $PARENT_DIR"
    ln -s "react-native-tvos" "$PARENT_DIR/react-native"
  fi
fi

echo "Cleaning existing ios directory to prevent ENOTEMPTY errors..."
rm -rf ios

echo "Re-generating the native iOS directory specifically for tvOS..."
# The @react-native-tvos/config-tv plugin in app.json reads EXPO_TV to configure tvOS schemes
export EXPO_TV=1
if ! npx expo prebuild --clean --platform ios; then
  echo "Error: Failed to prebuild the tvOS project."
  echo "Reverting react-native to standard..."
  pnpm install -w react-native@0.84.1
  exit 1
fi

echo "Generating ios/.xcode.env.local to ensure Node is found during Xcode build phases..."
echo "export NODE_BINARY=\$(command -v node)" > ios/.xcode.env.local

echo "Environment prepared! Opening Xcode workspace..."
open ios/CouchPotatoPlayer.xcworkspace

echo ""
echo "================================================================"
echo "⚠️ IMPORTANT: Please build and run your app on the Apple TV in Xcode."
echo "To run on the device WITHOUT requiring a Metro connection:"
echo "  1. In Xcode, go to Product -> Scheme -> Edit Scheme..."
echo "  2. Select 'Run' in the left sidebar."
echo "  3. Change the 'Build Configuration' from Debug to Release."
echo "  4. Close the window and build the app."
echo ""
echo "When you are completely finished, press ENTER to revert the dependencies"
echo "back to standard react-native."
echo "================================================================"
# If we are in CI or non-interactive terminal, pause so logs can be checked, else use read
if [ -n "$CI" ]; then
  echo "CI environment detected. Pausing for 60 seconds before reverting..."
  sleep 60
else
  read -r -p "Press ENTER to revert and exit..." || true
fi

echo "Reverting react-native to standard after tvOS build..."
pnpm install -w react-native@0.84.1
