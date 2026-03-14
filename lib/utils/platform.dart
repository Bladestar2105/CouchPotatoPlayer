import 'package:flutter/material.dart';

// Platform detection to mimic `src/utils/platform.ts`

bool isTV(BuildContext context) {
  // Simple heuristic for TV: if it's not mobile based on aspect ratio or very wide
  // Alternatively, just checking standard Flutter shortcuts
  // For a more robust TV check, you'd check target platform specifics.
  // We mimic the logic by assuming very wide screens or specifically configured TV modes.
  final size = MediaQuery.of(context).size;
  // Many TVs have a 16:9 aspect ratio and are landscape.
  // We can also just use a threshold width.
  return size.width > 900 && size.aspectRatio > 1.3;
}

bool isMobile(BuildContext context) {
  return !isTV(context);
}
