import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import * as Application from 'expo-application';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // ✅ Toggle state
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Image 
            source={require('../../logo/logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              autoCapitalize="none"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input with Eye Icon */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0 }]} // Remove border from input, keep on container
              placeholder="Password"
              secureTextEntry={!showPassword}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable 
              onPress={() => setShowPassword(!showPassword)} 
              style={styles.eyeIcon}
              hitSlop={10}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={colors.textSecondary} 
              />
            </Pressable>
          </View>

          {err ? <Text style={styles.error}>{err}</Text> : null}

          <Pressable 
            style={[styles.btn, loading && { opacity: 0.7 }]} 
            onPress={onSubmit} 
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Login'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: { 
    width: '100%', 
    maxWidth: 420, 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 24, 
    alignSelf: 'center'
  },
  logo: { 
    width: 250, 
    height: 150, 
    alignSelf: 'center', 
    marginBottom: 20 
  },
  title: { 
    color: 'white', 
    fontSize: 28, 
    fontWeight: '700', 
    textAlign: 'center' 
  },
  subtitle: { 
    color: '#9ca3af', 
    fontSize: 14, 
    textAlign: 'center', 
    marginBottom: 24 
  },
  
  // ✅ FIXED INPUT STYLING
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#243244',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    height: 50, // Fixed height keeps it standard size
    paddingHorizontal: 12, // Consistent padding
  },
  input: { 
    flex: 1, // Takes available width
    color: 'black',
    fontSize: 16,
    height: '100%', // Fills container height
  },
  eyeIcon: {
    padding: 8, // Hit target for finger
    justifyContent: 'center',
    alignItems: 'center',
  },

  btn: { 
    backgroundColor: '#4f46e5', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 10 
  },
  btnText: { 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 16 
  },
  error: { 
    color: '#ef4444', 
    marginBottom: 10, 
    textAlign: 'center',
    fontWeight: '600'
  },
});