import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, Linking, ScrollView, RefreshControl, Modal, TextInput, AppState } from 'react-native';
import dayjs from 'dayjs';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { attendanceApi } from '../api/attendanceApi';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme/theme';
import { planningApi } from '../api/planningApi';
import { scheduleShiftReminders } from '../utils/notifications';
import { queueOfflineAction, syncPendingActions, getPendingCount, getLocalAttendance, clearLocalAttendance } from '../utils/offlineSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PropTypes from 'prop-types';

const LEAVE_REQUEST_URL = 'https://msstn.sharepoint.com/sites/MSSAdminHRTasks/Lists/MSS%20Demande%20de%20congs/NewForm.aspx';

const StatItem = ({ label, value }) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

StatItem.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired };

const ActionButton = ({ loading, checkedIn, onPress }) => (
  <Pressable
    style={[styles.actionBtn, checkedIn ? styles.btnDanger : styles.btnSuccess, loading ? styles.btnDisabled : {}]}
    onPress={onPress}
    disabled={loading}
  >
    {loading ? <ActivityIndicator color="white" /> : <><Ionicons name={checkedIn ? "exit-outline" : "enter-outline"} size={24} color="white" style={{ marginRight: 8 }} /><Text style={styles.btnText}>{checkedIn ? 'Check Out' : 'Check In'}</Text></>}
  </Pressable>
);

ActionButton.propTypes = { loading: PropTypes.bool.isRequired, checkedIn: PropTypes.bool.isRequired, onPress: PropTypes.func.isRequired };

const StatusBanner = ({ status }) => {
  if (status === 'pending-absence') return <View style={[styles.completedContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}><Ionicons name="time" size={48} color={colors.warning} /><Text style={[styles.completedText, { color: colors.warning }]}>Request Pending</Text></View>;
  if (status === 'absent') return <View style={styles.completedContainer}><Ionicons name="alert-circle" size={48} color={colors.danger} /><Text style={[styles.completedText, { color: colors.danger }]}>Marked Absent</Text></View>;
  return <View style={styles.completedContainer}><Ionicons name="checkmark-circle" size={48} color={colors.success} /><Text style={styles.completedText}>Workday Completed</Text></View>;
};

StatusBanner.propTypes = { status: PropTypes.string };

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [now, setNow] = useState(dayjs());
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [absenceType, setAbsenceType] = useState('Repos');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);

  // Offline state
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [localAttendance, setLocalAttendance] = useState(null);
  const appState = useRef(AppState.currentState);

  const syncReminders = async () => {
    try {
      const enabled = await AsyncStorage.getItem('remindersEnabled');
      if (enabled !== 'true') return;
      const start = dayjs().startOf('month').format('YYYY-MM-DD');
      const end = dayjs().endOf('month').format('YYYY-MM-DD');
      const res = await planningApi.getMy({ startDate: start, endDate: end, limit: 100 });
      if (res.data) await scheduleShiftReminders(res.data);
    } catch (e) { console.log('Reminder sync failed'); }
  };

  const refreshToday = async () => {
    try {
      const res = await attendanceApi.getToday();
      setToday(res.data.attendance);
      // If server has data, clear any local offline attendance
      if (res.data.attendance) {
        await clearLocalAttendance();
        setLocalAttendance(null);
      }
    } catch (e) {
      // Offline — load local attendance state
      const local = await getLocalAttendance();
      if (local && (local.checkIn || local.checkOut)) {
        setLocalAttendance(local);
      }
    }
  };

  const refreshPendingCount = async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  };

  /**
   * Try to sync pending offline actions. Called on:
   * - App coming to foreground
   * - Pull-to-refresh
   * - Network state change (via interval check)
   */
  const attemptSync = async () => {
    const count = await getPendingCount();
    if (count === 0) return;

    // Check network connectivity
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) return;
    } catch {
      return; // Can't check network, skip sync
    }

    setSyncing(true);
    try {
      const result = await syncPendingActions();
      if (result.synced > 0) {
        await refreshToday();
        Alert.alert(
          '✅ Synced',
          `${result.synced} offline action(s) synced successfully.${result.failed > 0 ? `\n${result.failed} failed.` : ''}`
        );
      }
    } catch (e) {
      console.log('Sync attempt failed:', e.message);
    } finally {
      setSyncing(false);
      await refreshPendingCount();
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await attemptSync();
    await refreshToday();
    await syncReminders();
    await refreshPendingCount();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refreshToday();
    refreshPendingCount();
    const t = setInterval(() => setNow(dayjs()), 1000);

    // Listen for app coming to foreground to trigger sync
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        await attemptSync();
        await refreshToday();
        await refreshPendingCount();
      }
      appState.current = nextState;
    });

    // Periodic connectivity check for auto-sync (every 30s)
    const syncInterval = setInterval(async () => {
      const count = await getPendingCount();
      if (count > 0) {
        await attemptSync();
        await refreshToday();
        await refreshPendingCount();
      }
    }, 30000);

    return () => {
      clearInterval(t);
      clearInterval(syncInterval);
      subscription.remove();
    };
  }, []);

  const requestLocationPayload = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission denied.');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    return { location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } };
  };

  /**
   * Check if the error is a network/connectivity error.
   */
  const isNetworkError = (error) => {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('internet') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED'
    );
  };

  const performCheckIn = async (transportMethod) => {
    setLoading(true);
    try {
      const payload = await requestLocationPayload();
      payload.transportMethod = transportMethod;

      try {
        await attendanceApi.checkIn(payload);
        Alert.alert('Success', 'Checked in successfully.');
        await refreshToday();
      } catch (apiError) {
        if (isNetworkError(apiError)) {
          // Offline — queue the action
          await queueOfflineAction('checkIn', payload);
          await refreshPendingCount();
          const local = await getLocalAttendance();
          setLocalAttendance(local);
          Alert.alert(
            '📱 Saved Offline',
            'No internet connection. Your check-in has been saved and will sync automatically when you\'re back online.'
          );
        } else {
          throw apiError;
        }
      }
    } catch (e) { Alert.alert('Action Failed', e.message); } finally { setLoading(false); }
  };

  const performCheckOut = async (transportMethod) => {
    setLoading(true);
    try {
      const payload = await requestLocationPayload();
      payload.transportMethod = transportMethod;

      try {
        await attendanceApi.checkOut(payload);
        Alert.alert('Success', 'Checked out successfully.');
        await refreshToday();
      } catch (apiError) {
        if (isNetworkError(apiError)) {
          // Offline — queue the action
          await queueOfflineAction('checkOut', payload);
          await refreshPendingCount();
          const local = await getLocalAttendance();
          setLocalAttendance(local);
          Alert.alert(
            '📱 Saved Offline',
            'No internet connection. Your check-out has been saved and will sync automatically when you\'re back online.'
          );
        } else {
          throw apiError;
        }
      }
    } catch (e) { Alert.alert('Action Failed', e.message); } finally { setLoading(false); }
  };

  const handlePressAction = () => {
    const effectiveToday = today || localAttendance;
    const isCheckIn = !effectiveToday?.checkIn;
    const title = isCheckIn ? 'Check In' : 'Check Out';
    const action = isCheckIn ? performCheckIn : performCheckOut;
    Alert.alert(title, 'Select your transportation method:', [
      { text: 'Cancel', style: 'cancel' },
      { text: '🚗 Personal Transport', onPress: () => action('personal') },
      { text: '🚕 WASSALNI (Taxi)', onPress: () => action('wassalni'), style: 'default' }
    ]);
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
    if (!result.canceled) setFile(result.assets[0]);
  };

  const submitAbsence = async () => {
    if (!absenceType) return Alert.alert('Error', 'Please select a type');
    if (!reason) return Alert.alert('Error', 'Please enter a reason');

    // ✅ Optional file for Maladie (removed mandatory check)

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', absenceType);
      formData.append('reason', reason);
      if (file) {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'image/jpeg'
        });
      }

      await attendanceApi.markAbsent(formData);
      setModalVisible(false);
      await refreshToday();

      Alert.alert('Success', 'Request submitted. Opening SharePoint...');

      const supported = await Linking.canOpenURL(LEAVE_REQUEST_URL);
      if (supported) await Linking.openURL(LEAVE_REQUEST_URL);

    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  // Use local attendance as fallback when server data is unavailable
  const effectiveToday = today || localAttendance;
  const checkedIn = !!effectiveToday?.checkIn;
  const checkedOut = !!effectiveToday?.checkOut;
  const isFinished = (today && (checkedOut || today?.status === 'absent' || today?.status === 'pending-absence'))
    || (localAttendance && localAttendance.checkIn && localAttendance.checkOut);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.header}>
          <View>
            <Text style={typography.caption}>Welcome back,</Text>
            <Text style={typography.header}>{user?.name?.split(' ')[0] || 'Employee'}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatarMini}><Text style={styles.avatarMiniText}>{user?.name?.charAt(0) || 'U'}</Text></View>
          </Pressable>
        </View>

        {/* Pending Sync Banner */}
        {pendingCount > 0 && (
          <Pressable style={styles.syncBanner} onPress={attemptSync} disabled={syncing}>
            <Ionicons name={syncing ? "sync" : "cloud-upload-outline"} size={20} color="#f59e0b" />
            <Text style={styles.syncBannerText}>
              {syncing
                ? 'Syncing...'
                : `${pendingCount} offline action${pendingCount > 1 ? 's' : ''} pending sync`
              }
            </Text>
            {!syncing && <Text style={styles.syncBannerHint}>Tap to retry</Text>}
          </Pressable>
        )}

        <View style={styles.card}>
          <View style={styles.clockHeader}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={typography.caption}>{now.format('dddd, MMM D')}</Text>
          </View>
          <Text style={styles.time}>{now.format('HH:mm')}<Text style={styles.seconds}>{now.format(':ss')}</Text></Text>

          <View style={styles.statsRow}>
            <StatItem
              label={effectiveToday?.checkIn && !today?.checkIn ? "Check In ⏳" : "Check In"}
              value={effectiveToday?.checkIn ? dayjs(effectiveToday.checkIn).format('HH:mm') : '--:--'}
            />
            <View style={styles.divider} />
            <StatItem
              label={effectiveToday?.checkOut && !today?.checkOut ? "Check Out ⏳" : "Check Out"}
              value={effectiveToday?.checkOut ? dayjs(effectiveToday.checkOut).format('HH:mm') : '--:--'}
            />
            <View style={styles.divider} />
            <StatItem label="Hours" value={today?.workHours ? `${today.workHours.toFixed(1)}h` : '--'} />
          </View>

          {!isFinished ? <ActionButton loading={loading} checkedIn={checkedIn} onPress={handlePressAction} /> : <StatusBanner status={today?.status || 'present'} />}
        </View>

        {!isFinished && !checkedIn && (
          <Pressable style={styles.absentBtn} onPress={() => setModalVisible(true)} disabled={loading}>
            <Text style={styles.absentText}>Request Absence</Text>
            <Ionicons name="document-text-outline" size={16} color="#ef4444" style={{ marginLeft: 6 }} />
          </Pressable>
        )}

        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Request Absence</Text>
                <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable>
              </View>

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeRow}>
                {['Repos', 'Maladie', 'Other'].map(t => (
                  <Pressable key={t} onPress={() => setAbsenceType(t)} style={[styles.typeChip, absenceType === t && styles.typeChipActive]}>
                    <Text style={[styles.typeText, absenceType === t && styles.typeTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput style={styles.textArea} multiline numberOfLines={3} placeholder="Why are you absent?" placeholderTextColor={colors.textSecondary} value={reason} onChangeText={setReason} />

              <View style={styles.fileSection}>
                <Text style={styles.inputLabel}>Attachment (Optional)</Text>
                <Pressable onPress={handlePickDocument} style={styles.fileBtn}>
                  <Ionicons name="attach" size={20} color={colors.primary} />
                  <Text style={styles.fileBtnText}>{file ? file.name : 'Attach File (Image/PDF)'}</Text>
                </Pressable>
              </View>

              <Pressable style={styles.submitBtn} onPress={submitAbsence} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={styles.infoCard}>
          <Ionicons name="location-outline" size={24} color={colors.primary} />
          <Text style={styles.infoText}>Location services are active. You must be within the geofence to check in.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  avatarMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(99, 102, 241, 0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary },
  avatarMiniText: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginBottom: spacing.lg },
  clockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  time: { fontSize: 56, fontWeight: '800', color: colors.text, letterSpacing: 2, marginBottom: spacing.lg },
  seconds: { fontSize: 24, color: colors.textSecondary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.lg },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  divider: { width: 1, height: 30, backgroundColor: colors.border },
  actionBtn: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: borderRadius.lg },
  btnSuccess: { backgroundColor: colors.success },
  btnDanger: { backgroundColor: colors.danger },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
  completedContainer: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: 12, width: '100%' },
  completedText: { color: colors.success, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  infoCard: { flexDirection: 'row', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
  infoText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  absentBtn: { flexDirection: 'row', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20 },
  absentText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },

  // Sync banner
  syncBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  syncBannerText: { flex: 1, color: '#f59e0b', fontWeight: '700', fontSize: 14 },
  syncBannerHint: { color: '#f59e0b', fontSize: 12, fontWeight: '600', opacity: 0.7 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  inputLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 8, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { color: colors.textSecondary, fontWeight: '600' },
  typeTextActive: { color: 'white' },
  textArea: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 12, color: colors.text, fontSize: 16, height: 80, textAlignVertical: 'top', marginBottom: spacing.md },
  fileSection: { marginBottom: spacing.lg },
  fileBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md, borderStyle: 'dashed' },
  fileBtnText: { color: colors.primary, marginLeft: 8, fontWeight: '600' },
  submitBtn: { backgroundColor: colors.danger, padding: 16, borderRadius: borderRadius.md, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});