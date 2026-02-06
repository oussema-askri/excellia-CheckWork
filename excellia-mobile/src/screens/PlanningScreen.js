import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Pressable,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  TouchableOpacity
} from 'react-native';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ Safe Area
import { Ionicons } from '@expo/vector-icons';
import { planningApi } from '../api/planningApi';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const SHIFT_COLORS = {
  'Shift 0': { bg: '#d1fae5', text: '#065f46', border: '#34d399' },
  'Shift 1': { bg: '#bfdbfe', text: '#1e40af', border: '#60a5fa' },
  'Shift 2': { bg: '#fde68a', text: '#854d0e', border: '#fbbf24' },
  'Morning': { bg: '#e0f2fe', text: '#0369a1', border: '#38bdf8' },
  'Afternoon': { bg: '#fff7ed', text: '#9a3412', border: '#fb923c' },
  'Night': { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' },
  'Default': { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' },
};

const getShiftStyle = (shiftName) => {
  if (!shiftName) return SHIFT_COLORS.Default;
  const key = Object.keys(SHIFT_COLORS).find(k => 
    shiftName.toLowerCase().includes(k.toLowerCase())
  );
  return SHIFT_COLORS[key] || SHIFT_COLORS.Default;
};

export default function PlanningScreen() {
  const { user } = useAuth();
  
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [planningData, setPlanningData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dateListRef = useRef(null);

  const loadPlanning = async () => {
    setLoading(true);
    try {
      const startDate = currentMonth.startOf('month').format('YYYY-MM-DD');
      const endDate = currentMonth.endOf('month').format('YYYY-MM-DD');
      
      let data = [];
      if (user?.department) {
        try {
          const res = await planningApi.getAll({ startDate, endDate, limit: 1000 });
          data = res.data || [];
          data = data.filter(p => p.userId?.department === user.department);
        } catch {
          const res = await planningApi.getMy({ startDate, endDate, limit: 200 });
          data = res.data || [];
        }
      } else {
        const res = await planningApi.getMy({ startDate, endDate, limit: 200 });
        data = res.data || [];
      }
      setPlanningData(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlanning(); }, [currentMonth]);

  const daysInMonth = useMemo(() => {
    const days = [];
    const daysCount = currentMonth.daysInMonth();
    for (let i = 1; i <= daysCount; i++) {
      days.push(currentMonth.date(i));
    }
    return days;
  }, [currentMonth]);

  const dailyRoster = useMemo(() => {
    let dayData = planningData.filter(p => 
      dayjs(p.date).format('YYYY-MM-DD') === selectedDate
    );

    if (searchQuery) {
      dayData = dayData.filter(p => 
        p.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const grouped = dayData.reduce((acc, item) => {
      const shift = item.shift || 'Other';
      if (!acc[shift]) acc[shift] = [];
      acc[shift].push(item);
      return acc;
    }, {});

    return Object.keys(grouped).sort().map(key => ({
      title: key,
      data: grouped[key].sort((a, b) => a.employeeName.localeCompare(b.employeeName))
    }));
  }, [planningData, selectedDate, searchQuery]);

  const handlePrevMonth = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCurrentMonth(prev => prev.subtract(1, 'month')); };
  const handleNextMonth = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCurrentMonth(prev => prev.add(1, 'month')); };
  const handleSelectDate = (date) => setSelectedDate(date.format('YYYY-MM-DD'));

  const renderDateItem = ({ item }) => {
    const isSelected = item.format('YYYY-MM-DD') === selectedDate;
    const isToday = item.isSame(dayjs(), 'day');
    const isWeekend = [0, 6].includes(item.day());

    return (
      <Pressable 
        style={[styles.dateItem, isSelected && styles.dateItemSelected, isToday && !isSelected && styles.dateItemToday]} 
        onPress={() => handleSelectDate(item)}
      >
        <Text style={[styles.dateDayName, isSelected && styles.textSelected, isWeekend && !isSelected && styles.textWeekend]}>
          {item.format('ddd')}
        </Text>
        <Text style={[styles.dateNumber, isSelected && styles.textSelected]}>{item.format('DD')}</Text>
        {isSelected && <View style={styles.activeDot} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.iconBtn}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={styles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.iconBtn}><Ionicons name="chevron-forward" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <View style={styles.dateStrip}>
          <FlatList
            ref={dateListRef}
            data={daysInMonth}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.toString()}
            renderItem={renderDateItem}
            contentContainerStyle={{ paddingHorizontal: spacing.sm }}
          />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search colleague..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : dailyRoster.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cafe-outline" size={64} color={colors.border} />
          <Text style={styles.emptyText}>No shifts scheduled for this day</Text>
        </View>
      ) : (
        <FlatList
          data={dailyRoster}
          keyExtractor={item => item.title}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: spacing.md }}
          renderItem={({ item }) => {
            const style = getShiftStyle(item.title);
            return (
              <View style={styles.shiftSection}>
                <View style={[styles.shiftHeader, { borderLeftColor: style.border }]}>
                  <Text style={[styles.shiftTitle, { color: style.text }]}>{item.title}</Text>
                  <Text style={styles.shiftCount}>{item.data.length} People</Text>
                </View>
                {item.data.map(emp => {
                  const isMe = emp.employeeId === user?.employeeId;
                  return (
                    <View key={emp._id} style={[styles.card, isMe && styles.myCard]}>
                      <View style={styles.cardLeft}>
                        <View style={[styles.avatar, isMe && { backgroundColor: colors.primary }]}>
                          <Text style={styles.avatarText}>{emp.employeeName.charAt(0)}</Text>
                        </View>
                        <View>
                          <Text style={styles.empName}>{emp.employeeName} {isMe && '(You)'}</Text>
                          <Text style={styles.empId}>{emp.employeeId}</Text>
                        </View>
                      </View>
                      <View style={[styles.timeBadge, { backgroundColor: style.bg, borderColor: style.border }]}>
                        <Text style={[styles.timeText, { color: style.text }]}>{emp.startTime} - {emp.endTime}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  monthTitle: { ...typography.subheader, color: colors.text },
  iconBtn: { padding: spacing.xs },
  dateStrip: { height: 70 },
  dateItem: { width: 50, height: 64, marginHorizontal: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  dateItemSelected: { backgroundColor: colors.primary },
  dateItemToday: { borderWidth: 1, borderColor: colors.primary },
  dateDayName: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, textTransform: 'uppercase' },
  dateNumber: { fontSize: 18, fontWeight: '700', color: colors.text },
  textSelected: { color: 'white' },
  textWeekend: { color: colors.danger },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'white', marginTop: 4 },
  searchContainer: { margin: spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, height: 44, color: colors.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textSecondary, marginTop: spacing.md },
  shiftSection: { marginBottom: spacing.lg },
  shiftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, paddingLeft: spacing.sm, borderLeftWidth: 4 },
  shiftTitle: { fontSize: 16, fontWeight: '700' },
  shiftCount: { color: colors.textSecondary, fontSize: 12 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs },
  myCard: { borderWidth: 1, borderColor: colors.primary },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontWeight: '700', fontSize: 16 },
  empName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  empId: { color: colors.textSecondary, fontSize: 12 },
  timeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  timeText: { fontSize: 12, fontWeight: '700' },
});