import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { IPTVProvider } from './context/IPTVContext';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from './context/SettingsContext';
import './utils/i18n';
import { useTranslation } from 'react-i18next';

// Importez les écrans (SAUF SplashScreen)
import HomeScreen from './screens/HomeScreen';
import PlayerScreen from './screens/PlayerScreen';
import SeasonScreen from './screens/SeasonScreen';
import EpisodeScreen from './screens/EpisodeScreen';
import PinSetupScreen from './screens/PinSetupScreen';
import { Series, Season } from './types';

// Mettre à jour la liste des écrans (SAUF Splash)
export type RootStackParamList = {
  Home: undefined;
  Player: undefined;
  Season: { series: Series };
  Episode: { season: Season };
  PinSetup: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const { t } = useTranslation();
  return (
    <SettingsProvider>
      <SafeAreaProvider>
        <IPTVProvider>
          <StatusBar barStyle="light-content" />
        <NavigationContainer>
          <Stack.Navigator
            // --- L'ÉCRAN DE DÉMARRAGE EST DE RETOUR SUR "Home" ---
            initialRouteName="Home"
            screenOptions={{
              headerStyle: { backgroundColor: '#1A1A1A' },
              headerTintColor: '#FFF',
              headerBackTitleVisible: false,
            }}
          >
            {/* On a supprimé l'écran "Splash" */}
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: t('appTitle') }}
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
            </Stack.Navigator>
          </NavigationContainer>
        </IPTVProvider>
      </SafeAreaProvider>
    </SettingsProvider>
  );
};

export default App;