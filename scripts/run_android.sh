#!/bin/bash
echo "Starting Android application on default connected device/emulator..."
./gradlew :composeApp:installDebug
adb shell am start -n com.couchpotatoplayer.composeapp/com.couchpotatoplayer.composeapp.MainActivity
