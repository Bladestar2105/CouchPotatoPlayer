#!/bin/bash
set -e

echo "Starting Android application on default connected device/emulator..."

# Try to find adb
ADB_CMD=""
if command -v adb >/dev/null 2>&1; then
    ADB_CMD="adb"
elif [ -n "$ANDROID_HOME" ] && [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
    ADB_CMD="$ANDROID_HOME/platform-tools/adb"
elif [ -n "$ANDROID_SDK_ROOT" ] && [ -x "$ANDROID_SDK_ROOT/platform-tools/adb" ]; then
    ADB_CMD="$ANDROID_SDK_ROOT/platform-tools/adb"
elif [ -f "local.properties" ]; then
    # Extract sdk.dir from local.properties
    SDK_DIR=$(grep '^sdk\.dir=' local.properties | cut -d'=' -f2)
    # Remove trailing \r if present
    SDK_DIR=${SDK_DIR%$'\r'}
    # Unescape colons and equals if needed (common in local.properties)
    SDK_DIR=$(echo "$SDK_DIR" | sed 's/\\:/:/g' | sed 's/\\=/=/g' | sed 's/\\ / /g')

    if [ -n "$SDK_DIR" ] && [ -x "$SDK_DIR/platform-tools/adb" ]; then
        ADB_CMD="$SDK_DIR/platform-tools/adb"
    fi
fi

if [ -z "$ADB_CMD" ]; then
    echo "Error: adb command not found."
    echo "Please ensure adb is in your PATH, or set ANDROID_HOME / ANDROID_SDK_ROOT,"
    echo "or define sdk.dir in local.properties."
    exit 1
fi

# Check for connected devices before attempting to build
DEVICE_COUNT=$("$ADB_CMD" devices | grep -v "^List" | grep -v "^$" | grep -v "^\*" | wc -l)
if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "Error: No connected Android devices or emulators found."
    echo "Please connect a device or start an emulator and try again."
    exit 1
fi

# Build and install the app
./gradlew :composeApp:installDebug

"$ADB_CMD" shell am start -n com.couchpotatoplayer.composeapp/com.couchpotatoplayer.composeapp.MainActivity
