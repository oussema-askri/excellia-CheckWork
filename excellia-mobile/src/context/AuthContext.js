import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setBooting(false);
          return;
        }
        const res = await authApi.me();
        setUser(res.data.user);
      } catch (e) {
        await AsyncStorage.removeItem('token');
        setUser(null);
      } finally {
        setBooting(false);
      }
    };
    init();
  }, []);

  // ✅ Updated to accept deviceId
  const login = async (email, password, deviceId) => {
    const res = await authApi.login(email, password, deviceId);
    await AsyncStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    booting,
    isLoggedIn: !!user,
    login,
    logout,
  }), [user, booting]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}