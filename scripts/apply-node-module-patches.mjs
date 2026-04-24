import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const nodeModulesDir = path.join(rootDir, 'node_modules');

function replaceInPackageFile(relativePath, replacements) {
  const filePath = path.join(nodeModulesDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cannot apply dependency patch; missing ${relativePath}`);
  }

  let source = fs.readFileSync(filePath, 'utf8');
  let nextSource = source;

  for (const { from, to } of replacements) {
    if (nextSource.includes(from)) {
      nextSource = nextSource.split(from).join(to);
      continue;
    }
    if (!nextSource.includes(to)) {
      throw new Error(`Cannot apply dependency patch; expected text not found in ${relativePath}`);
    }
  }

  if (nextSource !== source) {
    fs.writeFileSync(filePath, nextSource);
    console.log(`[postinstall] patched ${relativePath}`);
  }
}

function patchReactNativePicker() {
  const replacements = [
    {
      from: 'const ContextContainer::Shared& contextContainer',
      to: 'const std::shared_ptr<const ContextContainer>& contextContainer',
    },
    {
      from: 'const ContextContainer::Shared contextContainer_;',
      to: 'const std::shared_ptr<const ContextContainer> contextContainer_;',
    },
  ];

  replaceInPackageFile(
    '@react-native-picker/picker/android/src/main/jni/RNCAndroidDialogPickerMeasurementsManager.h',
    replacements,
  );
  replaceInPackageFile(
    '@react-native-picker/picker/android/src/main/jni/RNCAndroidDropdownPickerMeasurementsManager.h',
    replacements,
  );
}

function patchReactNativeVlcMediaPlayer() {
  replaceInPackageFile('react-native-vlc-media-player/VLCPlayer.js', [
    {
      from: 'import ReactNative from "react-native";',
      to: 'import { StyleSheet, requireNativeComponent, NativeModules, View, UIManager, findNodeHandle } from "react-native";',
    },
    {
      from: 'const { StyleSheet, requireNativeComponent, NativeModules, View, UIManager } = ReactNative;\n',
      to: '',
    },
    {
      from: 'ReactNative.findNodeHandle(this)',
      to: 'findNodeHandle(this)',
    },
  ]);
}

patchReactNativePicker();
patchReactNativeVlcMediaPlayer();
