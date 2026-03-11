import React from 'react';
import './src/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LivePlayerScreen } from './src/screens/LivePlayerScreen';
import { EpgScreen } from './src/screens/EpgScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { PinSetupScreen } from './src/screens/PinSetupScreen';
import { MediaInfoScreen } from './src/screens/MediaInfoScreen';
import { useAppStore } from './src/store';
import { isTV, isMobile } from './src/utils/platform';
import { Tv, Search, Settings } from 'lucide-react-native';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ToastProvider } from './src/components/Toast';

// ─── Type definitions ────────────────────────────────────────────────
export type RootStackParamList = {
  Welcome: undefined;
  PinSetup: undefined;
  Home: undefined;           // TV: direct screen
  MainTabs: undefined;       // Mobile: bottom-tab wrapper
  LivePlayer: {
    channelId: number;
    channelName: string;
    extension?: string;
    directSource?: string;
    type?: 'live' | 'vod' | 'series';
  };
  MediaInfo: {
    id: number | string;
    type: 'vod' | 'series';
    title: string;
    cover?: string;
    extension?: string;
  };
  Epg: { channelId: number | string };
  Search: undefined;
  Settings: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  SettingsTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ─── Mobile Bottom-Tab Navigator ─────────────────────────────────────
function MobileMainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#2C2C2E',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: t('sidebar.live'),
          tabBarIcon: ({ color, size }) => <Tv color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: t('sidebar.search'),
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('sidebar.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root App ────────────────────────────────────────────────────────
export default function App() {
  const config = useAppStore((state) => state.config);
  const pin = useAppStore((state) => state.pin);

  // Determine which "home" route to use based on platform
  const homeRoute = isMobile ? 'MainTabs' : 'Home';
  const initialRoute = config ? (pin ? homeRoute : 'PinSetup') : 'Welcome';

  return (
    <SafeAreaProvider>
      <ToastProvider>
      {Platform.OS !== 'web' && (
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      )}
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#000' },
            ...(isMobile ? { animation: 'slide_from_right' } : {}),
          }}
          initialRouteName={initialRoute}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="PinSetup" component={PinSetupScreen} />

          {/* TV: original direct HomeScreen */}
          <Stack.Screen name="Home" component={HomeScreen} />

          {/* Mobile: Bottom-Tab wrapper */}
          <Stack.Screen name="MainTabs" component={MobileMainTabs} />

          {/* Shared detail screens */}
          <Stack.Screen
            name="LivePlayer"
            component={LivePlayerScreen}
            options={isMobile ? { animation: 'fade' } : {}}
          />
          <Stack.Screen name="MediaInfo" component={MediaInfoScreen} />
          <Stack.Screen name="Epg" component={EpgScreen} />

          {/* TV: these are navigated from sidebar; Mobile: via bottom tabs */}
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      </ToastProvider>
    </SafeAreaProvider>
  );
}