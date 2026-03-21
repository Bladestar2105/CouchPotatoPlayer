import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SettingsProvider } from '../context/SettingsContext';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();

export default function TestApp() {
  return (
    <SettingsProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
}