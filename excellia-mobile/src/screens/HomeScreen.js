import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import dayjs from 'dayjs';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { attendanceApi } from '../api/attendanceApi';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const [now, setNow] = useState(dayjs());
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshToday = async () => {
    try {
      const res = await attendanceApi.getToday();
      setToday(res.data.attendance);
    } catch (e) {
      // ignore
    }
  };
  const onMarkAbsent = async () => {
    Alert.alert(
      'Confirm Absence',
      'Are you sure you want to mark yourself as ABSENT today?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I am Absent',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await attendanceApi.markAbsent();
              await refreshToday();
              Alert.alert('Status Updated', 'You are marked as absent for today.');
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to mark absent');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  useEffect(() => {
    refreshToday();
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);

  const requestLocationPayload = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied.');
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    return {
      location: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }
    };
  };

  // ✅ Actual logic (called after confirmation)
  const handleAction = async (action) => {
    setLoading(true);
    try {
      const payload = await requestLocationPayload();
      if (action === 'checkIn') {
        await attendanceApi.checkIn(payload);
        Alert.alert('Success', 'Checked in successfully.');
      } else {
        await attendanceApi.checkOut(payload);
        Alert.alert('Success', 'Checked out successfully.');
      }
      await refreshToday();
    } catch (e) {
      Alert.alert('Action Failed', e.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Confirmation Dialog
  const confirmAction = (action) => {
    const isCheckIn = action === 'checkIn';
    const title = isCheckIn ? 'Confirm Check In' : 'Confirm Check Out';
    const message = isCheckIn
      ? 'Are you sure you want to start your shift?'
      : 'Are you sure you want to end your shift?';

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: isCheckIn ? 'Check In' : 'Check Out',
          onPress: () => handleAction(action),
          style: isCheckIn ? 'default' : 'destructive', // Check out looks "destructive" (red) on iOS
        },
      ],
      { cancelable: true }
    );
  };

  const checkedIn = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={typography.caption}>Welcome back,</Text>
          <Text style={typography.header}>{user?.name?.split(' ')[0] || 'Employee'}</Text>
        </View>
        <View style={styles.avatarMini}>
          <Text style={styles.avatarMiniText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
      </View>

      {/* Main Clock Card */}
      <View style={styles.card}>
        <View style={styles.clockHeader}>
          <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
          <Text style={typography.caption}>{now.format('dddd, MMM D, YYYY')}</Text>
        </View>

        <Text style={styles.time}>{now.format('HH:mm')}<Text style={styles.seconds}>{now.format(':ss')}</Text></Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Check In</Text>
            <Text style={styles.statValue}>{today?.checkIn ? dayjs(today.checkIn).format('HH:mm') : '--:--'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Check Out</Text>
            <Text style={styles.statValue}>{today?.checkOut ? dayjs(today.checkOut).format('HH:mm') : '--:--'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Hours</Text>
            <Text style={styles.statValue}>{today?.workHours ? `${today.workHours.toFixed(1)}h` : '--'}</Text>
          </View>
        </View>

        {!checkedOut ? (
          <Pressable
            style={[
              styles.actionBtn,
              checkedIn ? styles.btnDanger : styles.btnSuccess,
              loading && styles.btnDisabled
            ]}
            // ✅ Calls confirmAction instead of handleAction directly
            onPress={() => confirmAction(checkedIn ? 'checkOut' : 'checkIn')}
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
        ) : (
          <View style={styles.completedContainer}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.completedText}>Workday Completed</Text>
          </View>
        )}
      </View>
      {!today?.checkIn && !today?.status && (
        <Pressable
          style={styles.absentBtn}
          onPress={onMarkAbsent}
          disabled={loading}
        >
          <Text style={styles.absentText}>I am Absent Today</Text>
        </Pressable>
      )}
      {today?.status === 'absent' && (
        <View style={styles.absentBanner}>
          <Text style={styles.absentBannerText}>You are marked ABSENT today.</Text>
        </View>
      )}

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="location-outline" size={24} color={colors.primary} />
        <Text style={styles.infoText}>
          Location services are active. You must be within the geofence to check in.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    paddingTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarMini: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.primary
  },
  avatarMiniText: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: spacing.lg,
  },
  clockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  time: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  seconds: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  actionBtn: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnSuccess: {
    backgroundColor: colors.success,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  completedContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  completedText: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
   absentBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  absentText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 16,
  },
  absentBanner: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  absentBannerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});