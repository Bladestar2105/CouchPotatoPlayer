#!/bin/bash
echo "Starting Android application on default connected device/emulator..."
./gradlew :composeApp:installDebug
./gradlew :composeApp:launchDebug
