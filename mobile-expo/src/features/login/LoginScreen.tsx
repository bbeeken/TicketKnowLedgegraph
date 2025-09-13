import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { login } from '../../api/endpoints';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [useBiometric, setUseBiometric] = useState(false);

  const { login: authLogin, biometricEnabled, biometricSupported, authenticateWithBiometric, enableBiometric } = useAuth();

  useEffect(() => {
    // Check if biometric should be used
    if (biometricEnabled && biometricSupported) {
      setUseBiometric(true);
      handleBiometricLogin();
    }
  }, [biometricEnabled, biometricSupported]);

  const loginMutation = useMutation({
    mutationFn: (vars: { email: string; password: string }) => login(vars.email, vars.password),
    onSuccess: async (data: any) => {
      try {
        await authLogin(data.user, data.accessToken, data.refreshToken);

        // Offer to enable biometric after successful login
        if (!biometricEnabled && biometricSupported && !useBiometric) {
          Alert.alert(
            'Enable Biometric Login',
            'Would you like to use biometric authentication for faster login?',
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Enable',
                onPress: async () => {
                  const enabled = await enableBiometric();
                  if (!enabled) {
                    Alert.alert('Biometric Setup Failed', 'Please try again or use password login.');
                  }
                },
              },
            ]
          );
        }
      } catch (error) {
        Alert.alert('Login Error', 'Failed to save login information. Please try again.');
      }
    },
  onError: (error: any) => {
      Alert.alert('Login Failed', error.message || 'Invalid email or password');
    },
  });

  const handleBiometricLogin = async () => {
    if (!biometricEnabled) return;

    try {
      const authenticated = await authenticateWithBiometric();
      if (authenticated) {
        // Use stored credentials for biometric login
        // In a real app, you'd store the last successful credentials securely
        Alert.alert('Biometric Login', 'Please enter your credentials first, then biometric will be available.');
      }
    } catch (error) {
      console.error('Biometric login failed:', error);
    }
  };

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

  loginMutation.mutate({ email: email.trim(), password });
  };

  const handleBiometricToggle = async (value: boolean) => {
    setUseBiometric(value);
    if (value && !biometricEnabled) {
      const enabled = await enableBiometric();
      if (!enabled) {
        setUseBiometric(false);
        Alert.alert('Biometric Setup Failed', 'Please check your device settings and try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>OpsGraph</Text>
            <Text style={styles.tagline}>Enterprise Help Desk</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitleText}>Sign in to continue</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#A0AEC0"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#A0AEC0"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
            </View>

            <View style={styles.optionsContainer}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Remember me</Text>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={rememberMe ? '#f5dd4b' : '#f4f3f4'}
                />
              </View>

              {biometricSupported && (
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Use biometric login</Text>
                  <Switch
                    value={useBiometric}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={useBiometric ? '#f5dd4b' : '#f4f3f4'}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loginMutation.status === 'pending' && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loginMutation.status === 'pending'}
            >
              {loginMutation.status === 'pending' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {biometricEnabled && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
              >
                <Text style={styles.biometricButtonText}>🔐 Use Biometric Login</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3182CE',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#E6FFFD',
    opacity: 0.9,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A202C',
    backgroundColor: '#F7FAFC',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 16,
    color: '#2D3748',
  },
  loginButton: {
    backgroundColor: '#3182CE',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#3182CE',
    fontSize: 14,
    fontWeight: '500',
  },
  biometricButton: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  biometricButtonText: {
    color: '#3182CE',
    fontSize: 16,
    fontWeight: '600',
  },
});
