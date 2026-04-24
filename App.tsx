import '@expo/metro-runtime';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { IPTVProvider } from './context/IPTVContext';
import { Platform, StatusBar } from 'react-native';
import { tvTextSize } from './utils/tvAccessibility';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import './utils/i18n';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkMonitor } from './components/NetworkMonitor';

// Screen imports (SplashScreen is intentionally omitted)
import HomeScreen from './screens/HomeScreen';
import PlayerScreen from './screens/PlayerScreen';
import SeasonScreen from './screens/SeasonScreen';
import EpisodeScreen from './screens/EpisodeScreen';
import PinSetupScreen from './screens/PinSetupScreen';
import MediaInfoScreen from './screens/MediaInfoScreen';
import SearchScreen from './screens/SearchScreen';
import { Series, Season } from './types';

// Navigation route map (without Splash route)
export type RootStackParamList = {
  Home: {
    focusChannelId?: string;
    returnGroupId?: string | null;
    returnTab?: 'channels' | 'movies' | 'series' | 'favorites' | 'recent';
  } | undefined;
  Player: {
    focusChannelId?: string;
    returnGroupId?: string | null;
    returnTab?: 'channels' | 'movies' | 'series' | 'favorites' | 'recent';
    returnScreen?: 'Home';
    title?: string;
  } | undefined;
  Season: { series: Series; returnGroupId?: string | null; returnTab?: 'series' };
  Episode: { season: Season; returnGroupId?: string | null; returnTab?: 'series' };
  PinSetup: undefined;
  Search: undefined;
  MediaInfo: {
    id: string;
    type: 'vod' | 'series';
    title: string;
    cover?: string;
    streamUrl?: string;
    returnGroupId?: string | null;
    returnContentKey?: string;
    returnTab?: 'movies' | 'series';
  };
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const { t } = useTranslation();
  return (
    <SettingsProvider>
      <ThemeProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
        <IPTVProvider>
          {!Platform.isTV && <StatusBar barStyle="light-content" />}
          <NetworkMonitor />
        <NavigationContainer>
          <Stack.Navigator
            // App starts directly on Home.
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#2D4263',
                borderBottomWidth: 0,
                shadowOpacity: 0,
                elevation: 0,
              },
              headerTintColor: '#F0F0F2',
              headerTitleStyle: {
                fontWeight: '600',
                letterSpacing: 0.3,
                fontSize: tvTextSize(20),
              },
            }}
          >
            {/* Splash route intentionally removed */}
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: t('appTitle'), headerShown: false }}
            />
            <Stack.Screen
              name="Player"
              component={PlayerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Season"
              component={SeasonScreen}
              options={({ route }) => ({ title: route.params.series.name })}
            />
            <Stack.Screen
              name="Episode"
              component={EpisodeScreen}
              options={({ route }) => ({ title: route.params.season.name })}
            />
            <Stack.Screen
              name="PinSetup"
              component={PinSetupScreen}
              options={{ title: t('parentalControl') }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{ title: t('search') }}
            />
            <Stack.Screen
              name="MediaInfo"
              component={MediaInfoScreen}
              options={{ title: '' }}
            />
            </Stack.Navigator>
          </NavigationContainer>
        </IPTVProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
};

export default App;
