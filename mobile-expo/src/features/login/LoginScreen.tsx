import React from 'react';
import { View, Text, Button } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Login</Text>
      <Button title="Login (dev)" onPress={() => {}} />
    </View>
  );
}
