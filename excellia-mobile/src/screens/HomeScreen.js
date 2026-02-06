import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, Linking, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native'; // ✅ Import Navigation
import { attendanceApi } from '../api/attendanceApi';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

const LEAVE_REQUEST_URL = 'https://msstn.sharepoint.com/sites/MSSAdminHRTasks/Lists/MSS%20Demande%20de%20congs/NewForm.aspx?Source=https%3A%2F%2Fmsstn.sharepoint.com%2Fsites%2FMSSAdminHRTasks%2FLists%2FMSS%2520Demande%2520de%2520congs%2FAllItems.aspx%3FOR%3DTeams%252DHL%26CT%3D1701257252882%26clickparams%3DeyJBcHBOYW1lIjoiVGVhbXMtRGVza3RvcCIsIkFwcFZlcnNpb24iOiIyNy8yMzA5MjkxMTIwOCIsIkhhc0ZlZGVyYXRlZFVzZXIiOmZhbHNlfQ%253D%253D&ContentTypeId=0x010086FF04C4EB2D7240B1895D9B50FFB4870042B82C5E0460A14E9ACA8DCB154B57E4&RootFolder=';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation(); // ✅ Hook
  const [now, setNow] = useState(dayjs());
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshToday = async () => {
    try {
      const res = await attendanceApi.getToday();
      setToday(res.data.attendance);
    } catch (e) {}
  };

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

  const handleAction = async (action) => {
    setLoading(true);
    try {
      const payload = await requestLocationPayload();
      if (action === 'checkIn') await attendanceApi.checkIn(payload);
      else await attendanceApi.checkOut(payload);
      Alert.alert('Success', action === 'checkIn' ? 'Checked in.' : 'Checked out.');
      await refreshToday();
    } catch (e) {
      Alert.alert('Action Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onMarkAbsent = async () => {
    Alert.alert('Confirm Absence', 'Mark yourself absent and open leave request form?', [
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

  const confirmAction = (action) => {
    Alert.alert(action === 'checkIn' ? 'Check In' : 'Check Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => handleAction(action) }
    ]);
  };

  const checkedIn = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={typography.caption}>Welcome back,</Text>
            <Text style={typography.header}>{user?.name?.split(' ')[0] || 'Employee'}</Text>
          </View>
          
          {/* ✅ Clickable Avatar */}
          <Pressable onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>{user?.name?.charAt(0) || 'U'}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.clockHeader}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={typography.caption}>{now.format('dddd, MMM D')}</Text>
          </View>
          <Text style={styles.time}>{now.format('HH:mm')}<Text style={styles.seconds}>{now.format(':ss')}</Text></Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}><Text style={styles.statLabel}>Check In</Text><Text style={styles.statValue}>{today?.checkIn ? dayjs(today.checkIn).format('HH:mm') : '--:--'}</Text></View>
            <View style={styles.divider} />
            <View style={styles.statItem}><Text style={styles.statLabel}>Check Out</Text><Text style={styles.statValue}>{today?.checkOut ? dayjs(today.checkOut).format('HH:mm') : '--:--'}</Text></View>
            <View style={styles.divider} />
            <View style={styles.statItem}><Text style={styles.statLabel}>Hours</Text><Text style={styles.statValue}>{today?.workHours ? `${today.workHours.toFixed(1)}h` : '--'}</Text></View>
          </View>

          {!checkedOut && !today?.status?.includes('absent') ? (
            <Pressable style={[styles.actionBtn, checkedIn ? styles.btnDanger : styles.btnSuccess, loading && styles.btnDisabled]} onPress={() => confirmAction(checkedIn ? 'checkOut' : 'checkIn')} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <><Ionicons name={checkedIn ? "exit-outline" : "enter-outline"} size={24} color="white" style={{ marginRight: 8 }} /><Text style={styles.btnText}>{checkedIn ? 'Check Out' : 'Check In'}</Text></>}
            </Pressable>
          ) : today?.status === 'absent' ? (
            <View style={styles.completedContainer}><Ionicons name="alert-circle" size={48} color={colors.danger} /><Text style={[styles.completedText, { color: colors.danger }]}>Marked Absent</Text></View>
          ) : (
            <View style={styles.completedContainer}><Ionicons name="checkmark-circle" size={48} color={colors.success} /><Text style={styles.completedText}>Workday Completed</Text></View>
          )}
        </View>

        {!today?.checkIn && today?.status !== 'absent' && (
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
  completedContainer: { alignItems: 'center', paddingVertical: spacing.md },
  completedText: { color: colors.success, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  infoCard: { flexDirection: 'row', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
  infoText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  absentBtn: { flexDirection: 'row', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20 },
  absentText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
});