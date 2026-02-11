import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Pressable, ScrollView, 
  Modal, TextInput, ActivityIndicator, Alert, 
  KeyboardAvoidingView, Platform, Switch 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

// ✅ REAL NOTIFICATIONS ENABLED
import { 
  registerForPushNotificationsAsync, 
  scheduleDailyReminders, 
  cancelAllReminders 
} from '../utils/notifications';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem('remindersEnabled');
        setRemindersEnabled(saved === 'true');
      } catch (e) {}
    };
    loadSettings();
  }, []);

  const toggleReminders = async (value) => {
    try {
      if (value) {
        // ✅ Real Permission Request
        const granted = await registerForPushNotificationsAsync();
        
        if (granted) {
          await scheduleDailyReminders(); // Schedules 08:30 and 17:00
          setRemindersEnabled(true);
          await AsyncStorage.setItem('remindersEnabled', 'true');
          Alert.alert('Reminders On', 'You will be notified daily at 08:30 and 17:00.');
        } else {
          setRemindersEnabled(false); // Permission denied
          Alert.alert('Permission Required', 'Please enable notifications in your phone settings.');
        }
      } else {
        await cancelAllReminders();
        setRemindersEnabled(false);
        await AsyncStorage.setItem('remindersEnabled', 'false');
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Failed to update reminder settings.');
      setRemindersEnabled(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return Alert.alert('Error', 'Please fill in all fields');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'New passwords do not match');
    if (newPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');

    setLoading(true);
    try {
      await client.put('/auth/password', { currentPassword, newPassword, confirmPassword });
      Alert.alert('Success', 'Password changed successfully');
      setModalVisible(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const InfoItem = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.iconBox}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <View style={{ flex: 1 }}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || '—'}</Text></View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[typography.header, { marginBottom: spacing.lg }]}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{user?.department || 'No Dept'}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <InfoItem icon="id-card-outline" label="Employee ID" value={user?.employeeId} />
            <View style={styles.divider} />
            <InfoItem icon="mail-outline" label="Email Address" value={user?.email} />
            <View style={styles.divider} />
            <InfoItem icon="call-outline" label="Phone" value={user?.phone} />
            <View style={styles.divider} />
            <InfoItem icon="briefcase-outline" label="Position" value={user?.position} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={[styles.actionRow, { marginBottom: spacing.sm }]}>
            <View style={styles.actionRowLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <Text style={styles.actionText}>Daily Reminders</Text>
            </View>
            <Switch
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor={remindersEnabled ? '#fff' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleReminders}
              value={remindersEnabled}
            />
          </View>

          <Pressable style={styles.actionRow} onPress={() => setModalVisible(true)}>
            <View style={styles.actionRowLeft}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
              <Text style={styles.actionText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
          
          <Pressable style={[styles.actionRow, { marginTop: spacing.lg, backgroundColor: 'rgba(239, 68, 68, 0.1)' }]} onPress={logout}>
            <View style={styles.actionRowLeft}>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Sign Out</Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.version}>Excellia Mobile v1.0.0</Text>
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="Enter current password" placeholderTextColor={colors.textSecondary} value={currentPassword} onChangeText={setCurrentPassword} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="Min 6 characters" placeholderTextColor={colors.textSecondary} value={newPassword} onChangeText={setNewPassword} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="Re-enter new password" placeholderTextColor={colors.textSecondary} value={confirmPassword} onChangeText={setConfirmPassword} />
            </View>
            <Pressable style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={handleChangePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: 'center' },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99, 102, 241, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, borderWidth: 2, borderColor: colors.primary },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.primary },
  name: { ...typography.subheader, fontSize: 20, marginBottom: 4 },
  role: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1 },
  badge: { marginTop: spacing.md, backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  badgeText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.body, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.sm, marginLeft: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: spacing.xs },
  iconBox: { width: 40, alignItems: 'center' },
  infoLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 15, color: colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', width: '100%', marginVertical: spacing.sm },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs },
  actionRowLeft: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: spacing.md, fontSize: 16, fontWeight: '600', color: colors.text },
  version: { textAlign: 'center', marginTop: spacing.xl, color: colors.textSecondary, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 12, color: colors.text, fontSize: 16 },
  saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});