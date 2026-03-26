#!/bin/bash
set -e

echo "Starting Android application on default connected device/emulator..."

# Build and install the app
./gradlew :composeApp:installDebug

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

"$ADB_CMD" shell am start -n com.couchpotatoplayer.composeapp/com.couchpotatoplayer.composeapp.MainActivity
