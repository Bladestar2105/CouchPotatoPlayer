#!/usr/bin/env bash

# based on scripts in /engine/src/flutter/testing/scenario_app
# and xcode_backend.sh script for integration in xcode


# Exit on error
set -e

if [ "$2" = "" ]; then
	echo "Error: FLUTTER_LOCAL_ENGINE is not specified"
	break
fi

FLUTTER_LOCAL_ENGINE=$2

OUTDIR=$PWD/Flutter
rm -rf "$OUTDIR/Flutter.framework"

if [ "$1" = "release" ]; then
	echo "Copying Flutter.framework (release for tvOS device)..."
	# For tvOS device, use the tvOS-specific framework from the xcframework
	if [ -d "$FLUTTER_LOCAL_ENGINE/out/ios_release/Flutter.xcframework/tvos-arm64/Flutter.framework" ]; then
		cp -R "$FLUTTER_LOCAL_ENGINE/out/ios_release/Flutter.xcframework/tvos-arm64/Flutter.framework" "$OUTDIR"
	else
		# Fallback for older engine structure
		cp -R "$FLUTTER_LOCAL_ENGINE/out/ios_release/Flutter.framework" "$OUTDIR"
	fi
elif [ "$1" = "debug_sim" ] ; then
	echo "Copying Flutter.framework (debug-simulator for x86_64)..."
	# For tvOS simulator on Intel Mac
	if [ -d "$FLUTTER_LOCAL_ENGINE/out/ios_debug_sim_unopt/Flutter.xcframework/tvos-arm64_x86_64-simulator/Flutter.framework" ]; then
		cp -R "$FLUTTER_LOCAL_ENGINE/out/ios_debug_sim_unopt/Flutter.xcframework/tvos-arm64_x86_64-simulator/Flutter.framework" "$OUTDIR"
	else
		cp -R "$FLUTTER_LOCAL_ENGINE/out/ios_debug_sim_unopt/Flutter.framework" "$OUTDIR"
	fi
elif [ "$1" = "debug_sim_arm64" ] ; then
	echo "Copying Flutter.framework (debug-simulator for ARM64)..."
	# For tvOS simulator on Apple Silicon Mac
	if [ -d "$FLUTTER_LOCAL_ENGINE/out/ios_debug_sim_unopt_arm64/Flutter.xcframework/tvos-arm64_x86_64-simulator/Flutter.framework" ]; then
		cp -R "$FLUTTER_LOCAL_ENGINE/out/ios_debug_sim_unopt_arm64/Flutter.xcframework/tvos-arm64_x86_64-simulator/Flutter.framework" "$OUTDIR"
	else
		cp -R "$FLUTTER_LOCAL_ENGINE/out/ios_debug_sim_unopt_arm64/Flutter.framework" "$OUTDIR"
	fi
else
	# debug
	echo "Copying Flutter.framework (debug for tvOS device)..."
	if [ -d "$FLUTTER_LOCAL_ENGINE/out/ios_debug_unopt/Flutter.xcframework/tvos-arm64/Flutter.framework" ]; then
		cp -R "$FLUTTER_LOCAL_ENGINE/out/ios_debug_unopt/Flutter.xcframework/tvos-arm64/Flutter.framework" "$OUTDIR"
	else
		cp -R "$FLUTTER_LOCAL_ENGINE/out/ios_debug_unopt/Flutter.framework" "$OUTDIR"
	fi
fi

echo "Flutter.framework copied to $OUTDIR/Flutter.framework"