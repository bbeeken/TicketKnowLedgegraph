import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../features/login/LoginScreen';
import SitesScreen from '../features/sites/SitesScreen';
import AlertsScreen from '../features/alerts/AlertsScreen';
import TicketsScreen from '../features/tickets/TicketsScreen';

const Stack = createNativeStackNavigator();

export function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Sites" component={SitesScreen} />
        <Stack.Screen name="Alerts" component={AlertsScreen} />
        <Stack.Screen name="Tickets" component={TicketsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Navigation;
