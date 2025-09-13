import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Import screens
import LoginScreen from '../features/login/LoginScreen';
import SitesScreen from '../features/sites/SitesScreen';
// Update the import path below to match the actual location and name of your AlertsScreen file.
// For example, if the file is named AlertScreen.tsx (singular) or located elsewhere, update accordingly.
// import AlertsScreen from '../features/alerts/AlertScreen';
import AlertsScreen from '../features/alerts/AlertsScreen';
import TicketsScreen from '../features/tickets/TicketsScreen';
import TicketDetailScreen from '../features/tickets/TicketDetailScreen';

const Stack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Sites" component={SitesScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
  <Stack.Screen name="Tickets" component={TicketsScreen} />
  <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3182CE" />
    </View>
  );
}

export function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default Navigation;
