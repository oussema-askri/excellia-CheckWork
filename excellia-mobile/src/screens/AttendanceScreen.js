import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { attendanceApi } from '../api/attendanceApi';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

export default function AttendanceScreen() {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const startDate = useMemo(() => currentMonth.startOf('month').format('YYYY-MM-DD'), [currentMonth]);
  const endDate = useMemo(() => currentMonth.endOf('month').format('YYYY-MM-DD'), [currentMonth]);

  const load = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const res = await attendanceApi.getMy({ startDate, endDate, limit: 200 });
      const data = res.data || [];
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setItems(data);
    } catch (e) {
      setItems([]);
      setErrorText(e?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [startDate, endDate]);

  const prevMonth = () => setCurrentMonth((m) => m.subtract(1, 'month'));
  const nextMonth = () => setCurrentMonth((m) => m.add(1, 'month'));
  const goToday = () => setCurrentMonth(dayjs());

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return colors.success;
      case 'late': return colors.warning;
      case 'absent': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[typography.header, { marginBottom: spacing.md }]}>My Attendance</Text>

      {/* Month Navigation */}
      <View style={styles.navBar}>
        <Pressable onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>
        <Pressable onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
        <Pressable onPress={goToday} style={styles.todayBtn}>
          <Text style={styles.todayText}>Today</Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : errorText ? (
        <View style={styles.center}><Text style={styles.errorText}>{errorText}</Text></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>No records found</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x._id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={[styles.statusStrip, { backgroundColor: getStatusColor(item.status) }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.dateText}>{dayjs(item.date).format('ddd, MMM D')}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>In</Text>
                    <Text style={styles.timeValue}>{item.checkIn ? dayjs(item.checkIn).format('HH:mm') : '--:--'}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.border} />
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Out</Text>
                    <Text style={styles.timeValue}>{item.checkOut ? dayjs(item.checkOut).format('HH:mm') : '--:--'}</Text>
                  </View>
                  <View style={styles.hoursBlock}>
                    <Text style={styles.hoursValue}>{item.workHours ? `${Number(item.workHours).toFixed(1)}h` : '--'}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.xl },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  navBtn: { padding: spacing.sm },
  monthTitle: { flex: 1, textAlign: 'center', color: colors.text, fontWeight: '700', fontSize: 16 },
  todayBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.sm, marginRight: 4 },
  todayText: { color: 'white', fontWeight: '600', fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger },
  emptyText: { color: colors.textSecondary, marginTop: spacing.sm },
  
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statusStrip: { width: 4 },
  cardContent: { flex: 1, padding: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  dateText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeBlock: { alignItems: 'center' },
  timeLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 2 },
  timeValue: { color: colors.text, fontWeight: '600', fontSize: 15 },
  hoursBlock: { backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  hoursValue: { color: colors.primary, fontWeight: '700' },
});