import '@expo/metro-runtime';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { IPTVProvider } from './context/IPTVContext';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from './context/SettingsContext';
import './utils/i18n';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkMonitor } from './components/NetworkMonitor';

// Importez les écrans (SAUF SplashScreen)
import HomeScreen from './screens/HomeScreen';
import PlayerScreen from './screens/PlayerScreen';
import SeasonScreen from './screens/SeasonScreen';
import EpisodeScreen from './screens/EpisodeScreen';
import PinSetupScreen from './screens/PinSetupScreen';
import MediaInfoScreen from './screens/MediaInfoScreen';
import SearchScreen from './screens/SearchScreen';
import { Series, Season } from './types';

// Mettre à jour la liste des écrans (SAUF Splash)
export type RootStackParamList = {
  Home: undefined;
  Player: undefined;
  Season: { series: Series };
  Episode: { season: Season };
  PinSetup: undefined;
  Search: undefined;
  MediaInfo: { id: string; type: 'vod' | 'series'; title: string; cover?: string; streamUrl?: string; };
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const { t } = useTranslation();
  return (
    <SettingsProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
        <IPTVProvider>
          <StatusBar barStyle="light-content" />
          <NetworkMonitor />
        <NavigationContainer>
          <Stack.Navigator
            // --- L'ÉCRAN DE DÉMARRAGE EST DE RETOUR SUR "Home" ---
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#1A1A24',
                borderBottomWidth: 0,
                shadowOpacity: 0,
                elevation: 0,
              },
              headerTintColor: '#F0F0F2',
              headerTitleStyle: {
                fontWeight: '600',
                letterSpacing: 0.3,
              },
            }}
          >
            {/* On a supprimé l'écran "Splash" */}
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
    </SettingsProvider>
  );
};

export default App;
