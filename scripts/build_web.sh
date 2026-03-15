#!/bin/sh
echo "Building and launching for Web..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Start the Expo web development server
npx expo start --web
