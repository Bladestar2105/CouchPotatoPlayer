import React from 'react';
import './src/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LivePlayerScreen } from './src/screens/LivePlayerScreen';
import { EpgScreen } from './src/screens/EpgScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { useAppStore } from './src/store';

import { SettingsScreen } from './src/screens/SettingsScreen';
import { PinSetupScreen } from './src/screens/PinSetupScreen';

export type RootStackParamList = {
  Welcome: undefined;
  PinSetup: undefined;
  Home: undefined;
  LivePlayer: { channelId: number; channelName: string; extension?: string; directSource?: string; type?: 'live' | 'vod' | 'series' };
  Epg: { channelId: number | string };
  Search: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const config = useAppStore((state) => state.config);
  const pin = useAppStore((state) => state.pin);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' }
        }}
        initialRouteName={config ? (pin ? 'Home' : 'PinSetup') : 'Welcome'}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="PinSetup" component={PinSetupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="LivePlayer" component={LivePlayerScreen} />
        <Stack.Screen name="Epg" component={EpgScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
