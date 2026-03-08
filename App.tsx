import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LivePlayerScreen } from './src/screens/LivePlayerScreen';
import { EpgScreen } from './src/screens/EpgScreen';
import { useAppStore } from './src/store';

export type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
  LivePlayer: { channelId: number; channelName: string; extension?: string; directSource?: string };
  Epg: { channelId: number | string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const config = useAppStore((state) => state.config);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' }
        }}
        initialRouteName={config ? 'Home' : 'Welcome'}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="LivePlayer" component={LivePlayerScreen} />
        <Stack.Screen name="Epg" component={EpgScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
