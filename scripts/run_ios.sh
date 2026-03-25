#!/bin/bash
echo "Starting iOS application on simulator..."
echo "Ensure you have an iOS simulator running."
./gradlew :composeApp:iosSimulatorArm64Binaries
# Note: For full run loop, typically run from Xcode or specialized KMP run script.
# Provide instructions for standard Xcode opening.
echo "Build complete. Open composeApp/iosApp/iosApp.xcworkspace in Xcode to run."
