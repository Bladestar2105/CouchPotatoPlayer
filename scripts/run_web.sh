#!/bin/bash
echo "Starting Web application..."
./gradlew :composeApp:wasmJsBrowserDevelopmentRun --continuous
