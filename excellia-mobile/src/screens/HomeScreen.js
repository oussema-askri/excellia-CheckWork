import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, Linking, ScrollView, RefreshControl } from 'react-native';
import dayjs from 'dayjs';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { attendanceApi } from '../api/attendanceApi';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme/theme';
import { planningApi } from '../api/planningApi';
import { scheduleShiftReminders } from '../utils/notifications';
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
    {loading ? (
      <ActivityIndicator color="white" />
    ) : (
      <>
        <Ionicons name={checkedIn ? "exit-outline" : "enter-outline"} size={24} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.btnText}>{checkedIn ? 'Check Out' : 'Check In'}</Text>
      </>
    )}
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

  const syncReminders = async () => {
    try {
      const enabled = await AsyncStorage.getItem('remindersEnabled');
      if (enabled !== 'true') return;
      const start = dayjs().startOf('month').format('YYYY-MM-DD');
      const end = dayjs().endOf('month').format('YYYY-MM-DD');
      const res = await planningApi.getMy({ startDate: start, endDate: end, limit: 100 });
      if (res.data) await scheduleShiftReminders(res.data);
    } catch (e) { console.log('Reminder sync failed', e); }
  };

  useEffect(() => { syncReminders(); }, []);

  const refreshToday = async () => {
    try {
      const res = await attendanceApi.getToday();
      setToday(res.data.attendance);
    } catch (e) { console.log(e); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshToday();
    await syncReminders();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refreshToday();
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);

  const requestLocationPayload = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission denied.');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    return { location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } };
  };

  const performCheckIn = async (transportMethod) => {
    setLoading(true);
    try {
      const payload = await requestLocationPayload();
      payload.transportMethod = transportMethod;
      await attendanceApi.checkIn(payload);
      Alert.alert('Success', 'Checked in successfully.');
      await refreshToday();
    } catch (e) {
      Alert.alert('Action Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Updated CheckOut to accept transport
  const performCheckOut = async (transportMethod) => {
    setLoading(true);
    try {
      const payload = await requestLocationPayload();
      payload.transportMethod = transportMethod;
      await attendanceApi.checkOut(payload);
      Alert.alert('Success', 'Checked out successfully.');
      await refreshToday();
    } catch (e) {
      Alert.alert('Action Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Unified Handler for both actions
  const handlePressAction = () => {
    const isCheckIn = !today?.checkIn;
    const title = isCheckIn ? 'Check In' : 'Check Out';
    const action = isCheckIn ? performCheckIn : performCheckOut;

    Alert.alert(
      title,
      'Select your transportation method:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: '🚗 Personal Transport', 
          onPress: () => action('personal') 
        },
        { 
          text: '🚕 WASSALNI (Taxi)', 
          onPress: () => action('wassalni'),
          style: 'default' 
        }
      ]
    );
  };

  const onMarkAbsent = async () => {
    Alert.alert('Confirm Absence', 'Mark yourself absent?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await attendanceApi.markAbsent();
            await refreshToday();
            const supported = await Linking.canOpenURL(LEAVE_REQUEST_URL);
            if (supported) await Linking.openURL(LEAVE_REQUEST_URL);
          } catch (e) { Alert.alert('Error', e.message); } finally { setLoading(false); }
      }}
    ]);
  };

  const checkedIn = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;
  const isFinished = checkedOut || today?.status === 'absent' || today?.status === 'pending-absence';

  let renderAction;
  if (!isFinished) {
    renderAction = <ActionButton loading={loading} checkedIn={checkedIn} onPress={handlePressAction} />;
  } else {
    renderAction = <StatusBanner status={today?.status} />;
  }

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

        <View style={styles.card}>
          <View style={styles.clockHeader}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={typography.caption}>{now.format('dddd, MMM D')}</Text>
          </View>
          <Text style={styles.time}>{now.format('HH:mm')}<Text style={styles.seconds}>{now.format(':ss')}</Text></Text>

          <View style={styles.statsRow}>
            <StatItem label="Check In" value={today?.checkIn ? dayjs(today.checkIn).format('HH:mm') : '--:--'} />
            <View style={styles.divider} />
            <StatItem label="Check Out" value={today?.checkOut ? dayjs(today.checkOut).format('HH:mm') : '--:--'} />
            <View style={styles.divider} />
            <StatItem label="Hours" value={today?.workHours ? `${today.workHours.toFixed(1)}h` : '--'} />
          </View>

          {renderAction}
        </View>

        {!isFinished && !checkedIn && (
          <Pressable style={styles.absentBtn} onPress={onMarkAbsent} disabled={loading}>
            <Text style={styles.absentText}>I am Absent Today</Text>
            <Ionicons name="open-outline" size={16} color="#ef4444" style={{ marginLeft: 6 }} />
          </Pressable>
        )}

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
});