import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';

import App from './App';

// Fallback for React Native where WebCryptoAPI and crypto module are missing
bcrypt.setRandomFallback((len) => {
  const buf = new Uint8Array(len);
  return Array.from(Crypto.getRandomValues(buf));
});

registerRootComponent(App);
