import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  HomeScreen,
  ContactsScreen,
  SettingsScreen,
  HistoryScreen,
} from './screens';
import { COLORS, NAV_SCREENS } from './constants';

const Stack = createStackNavigator();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.light },
        }}
      >
        <Stack.Screen
          name={NAV_SCREENS.HOME}
          component={HomeScreen}
          options={{}}        />
        <Stack.Screen
          name={NAV_SCREENS.CONTACTS}
          component={ContactsScreen}
        />
        <Stack.Screen
          name={NAV_SCREENS.SETTINGS}
          component={SettingsScreen}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
