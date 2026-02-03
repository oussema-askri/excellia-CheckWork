import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as Application from 'expo-application';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const getDeviceId = async () => {
    let id = null;
    try {
      if (Platform.OS === 'android') {
        id = Application.getAndroidId();
      } else if (Platform.OS === 'ios') {
        id = await Application.getIosIdForVendorAsync();
      }
    } catch (e) {
      console.log('Device ID Error:', e);
    }

    // Fallback if real ID fails (common in Expo Go or Emulators)
    if (!id) {
      id = `fallback-${Platform.OS}-${Math.random().toString(36).slice(2)}`;
    }
    
    console.log('📱 Sending Device ID:', id);
    return id;
  };

  const onSubmit = async () => {
    if (!email || !password) {
      setErr('Please enter email and password');
      return;
    }

    setErr('');
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      await login(email.trim(), password, deviceId);
    } catch (e) {
      setErr(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
    >
      <View style={styles.card}>
        <Image 
          source={require('../../logo/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
        />

        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Pressable style={[styles.btn, loading && { opacity: 0.7 }]} onPress={onSubmit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Login'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#ffffff' },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  logo: { width: 250, height: 150, alignSelf: 'center', marginBottom: 20 },
  title: {color:'white',fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginBottom: 18 },
  input: { backgroundColor: '#ffffff', borderColor: '#243244', borderWidth: 1, borderRadius: 12, padding: 12, color: 'black', marginBottom: 10 },
  btn: { backgroundColor: '#342989', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnText: { color: 'white', fontWeight: '700' },
  error: { color: '#ef4444', marginBottom: 6, textAlign: 'center' },
});