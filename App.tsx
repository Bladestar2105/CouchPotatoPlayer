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

type BoundaryNavigation = {
  canGoBack?: () => boolean;
  goBack?: () => void;
  navigate?: (screenName: string) => void;
  reset?: (state: { index: number; routes: Array<{ name: string }> }) => void;
};

type BoundaryNavigationProps = {
  navigation?: BoundaryNavigation;
};

// Wrap every screen component in its own ErrorBoundary so a render crash on
// one screen cannot take down the whole app: the user can return to Home
// or retry. The top-level ErrorBoundary in `App` is
// still in place as a last-resort catch for errors that happen outside the
// navigator (providers, NetworkMonitor, etc.).
//
// The wrapped components MUST be created once at module load, not inline in
// the render, because React Navigation tracks component identity to manage
// screen state. `React.memo` would not be enough; the wrapped reference has
// to be stable across renders.
const withScreenBoundary = <P extends object>(
  Screen: React.ComponentType<P>,
): React.ComponentType<P> => {
  const Wrapped = (props: P) => {
    const navigation = (props as BoundaryNavigationProps).navigation;
    const handleFallbackBack = () => {
      if (navigation?.reset) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        return;
      }
      if (navigation?.canGoBack?.()) {
        navigation.goBack?.();
        return;
      }
      navigation?.navigate?.('Home');
    };

    return (
      <ErrorBoundary onFallbackBack={navigation ? handleFallbackBack : undefined}>
        <Screen {...props} />
      </ErrorBoundary>
    );
  };
  Wrapped.displayName = `WithScreenBoundary(${Screen.displayName || Screen.name || 'Screen'})`;
  return Wrapped;
};

const HomeScreenWithBoundary = withScreenBoundary(HomeScreen);
const PlayerScreenWithBoundary = withScreenBoundary(PlayerScreen);
const SeasonScreenWithBoundary = withScreenBoundary(SeasonScreen);
const EpisodeScreenWithBoundary = withScreenBoundary(EpisodeScreen);
const PinSetupScreenWithBoundary = withScreenBoundary(PinSetupScreen);
const MediaInfoScreenWithBoundary = withScreenBoundary(MediaInfoScreen);
const SearchScreenWithBoundary = withScreenBoundary(SearchScreen);

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
  Episode: { season: Season; series?: Series; returnGroupId?: string | null; returnTab?: 'series' };
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
              component={HomeScreenWithBoundary}
              options={{ title: t('appTitle'), headerShown: false }}
            />
            <Stack.Screen
              name="Player"
              component={PlayerScreenWithBoundary}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Season"
              component={SeasonScreenWithBoundary}
              options={({ route }) => ({ title: route.params.series.name })}
            />
            <Stack.Screen
              name="Episode"
              component={EpisodeScreenWithBoundary}
              options={({ route }) => ({ title: route.params.season.name })}
            />
            <Stack.Screen
              name="PinSetup"
              component={PinSetupScreenWithBoundary}
              options={{ title: t('parentalControl') }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreenWithBoundary}
              options={{ title: t('search') }}
            />
            <Stack.Screen
              name="MediaInfo"
              component={MediaInfoScreenWithBoundary}
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
