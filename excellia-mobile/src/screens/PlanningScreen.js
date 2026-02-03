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
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl
} from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { planningApi } from '../api/planningApi';
import { useAuth } from '../context/AuthContext';

// Enable animations for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DATE_ITEM_WIDTH = 56;

// Modern Color Palette
const COLORS = {
  // Base
  background: '#0f172a',
  card: '#1e293b',
  cardElevated: '#334155',
  
  // Text
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  
  // Primary
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  
  // Accents
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  
  // Borders
  border: '#334155',
  borderLight: '#475569',
};

// Shift Configurations with Gradients
const SHIFT_CONFIG = {
  'Shift 0': {
    gradient: ['#059669', '#10b981'],
    bg: 'rgba(16, 185, 129, 0.15)',
    text: '#34d399',
    border: '#10b981',
    icon: 'sunny-outline',
    label: 'Morning Shift'
  },
  'Shift 1': {
    gradient: ['#2563eb', '#3b82f6'],
    bg: 'rgba(59, 130, 246, 0.15)',
    text: '#60a5fa',
    border: '#3b82f6',
    icon: 'partly-sunny-outline',
    label: 'Evening Shift'
  },
  'Shift 2': {
    gradient: ['#7c3aed', '#8b5cf6'],
    bg: 'rgba(139, 92, 246, 0.15)',
    text: '#a78bfa',
    border: '#8b5cf6',
    icon: 'moon-outline',
    label: 'Night Shift'
  },
  'Default': {
    gradient: ['#475569', '#64748b'],
    bg: 'rgba(100, 116, 139, 0.15)',
    text: '#94a3b8',
    border: '#64748b',
    icon: 'time-outline',
    label: 'Shift'
  },
};

const getShiftConfig = (shiftName) => {
  if (!shiftName) return SHIFT_CONFIG.Default;
  const key = Object.keys(SHIFT_CONFIG).find(k =>
    shiftName.toLowerCase().includes(k.toLowerCase())
  );
  return SHIFT_CONFIG[key] || SHIFT_CONFIG.Default;
};

// Animated Date Item Component
const DateItem = ({ item, isSelected, isToday, isWeekend, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.dateItem,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {isSelected ? (
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.dateItemGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.dateDayName, styles.textWhite]}>
              {item.format('ddd')}
            </Text>
            <Text style={[styles.dateNumber, styles.textWhite]}>
              {item.format('DD')}
            </Text>
            <View style={styles.activeDot} />
          </LinearGradient>
        ) : (
          <View style={[
            styles.dateItemInner,
            isToday && styles.dateItemToday
          ]}>
            <Text style={[
              styles.dateDayName,
              isWeekend && styles.textWeekend
            ]}>
              {item.format('ddd')}
            </Text>
            <Text style={[
              styles.dateNumber,
              isWeekend && styles.textWeekend
            ]}>
              {item.format('DD')}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

// Employee Card Component
const EmployeeCard = ({ employee, isMe, shiftConfig, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.employeeCard,
        isMe && styles.myCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Left Section */}
      <View style={styles.employeeLeft}>
        <LinearGradient
          colors={isMe ? [COLORS.primary, COLORS.primaryDark] : shiftConfig.gradient}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>
            {employee.employeeName?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </LinearGradient>

        <View style={styles.employeeInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.employeeName} numberOfLines={1}>
              {employee.employeeName}
            </Text>
            {isMe && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.employeeId}>{employee.employeeId}</Text>
        </View>
      </View>

      {/* Right Section - Time */}
      <View style={[styles.timeBadge, { backgroundColor: shiftConfig.bg, borderColor: shiftConfig.border }]}>
        <Ionicons name="time-outline" size={12} color={shiftConfig.text} style={{ marginRight: 4 }} />
        <Text style={[styles.timeText, { color: shiftConfig.text }]}>
          {employee.startTime} - {employee.endTime}
        </Text>
      </View>
    </Animated.View>
  );
};

// Shift Section Component
const ShiftSection = ({ shift, employees, currentUser }) => {
  const config = getShiftConfig(shift);

  return (
    <View style={styles.shiftSection}>
      {/* Shift Header */}
      <View style={styles.shiftHeader}>
        <View style={styles.shiftHeaderLeft}>
          <LinearGradient
            colors={config.gradient}
            style={styles.shiftIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={config.icon} size={16} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[styles.shiftTitle, { color: config.text }]}>{shift}</Text>
            <Text style={styles.shiftLabel}>{config.label}</Text>
          </View>
        </View>
        <View style={[styles.countBadge, { backgroundColor: config.bg }]}>
          <Text style={[styles.countText, { color: config.text }]}>
            {employees.length} {employees.length === 1 ? 'person' : 'people'}
          </Text>
        </View>
      </View>

      {/* Employee Cards */}
      {employees.map((emp, index) => (
        <EmployeeCard
          key={emp._id}
          employee={emp}
          isMe={emp.employeeId === currentUser?.employeeId}
          shiftConfig={config}
          index={index}
        />
      ))}
    </View>
  );
};

// Main Component
export default function PlanningScreen() {
  const { user } = useAuth();

  // State
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [planningData, setPlanningData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const dateListRef = useRef(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Load Data
  const loadPlanning = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlanning();
  }, [currentMonth]);

  // Animate header on mount
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Generate days for the month
  const daysInMonth = useMemo(() => {
    const days = [];
    const daysCount = currentMonth.daysInMonth();
    for (let i = 1; i <= daysCount; i++) {
      days.push(currentMonth.date(i));
    }
    return days;
  }, [currentMonth]);

  // Filter and group data
  const dailyRoster = useMemo(() => {
    let dayData = planningData.filter(p =>
      dayjs(p.date).format('YYYY-MM-DD') === selectedDate
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      dayData = dayData.filter(p =>
        p.employeeName?.toLowerCase().includes(query) ||
        p.employeeId?.toLowerCase().includes(query)
      );
    }

    // Group by Shift
    const grouped = dayData.reduce((acc, item) => {
      const shift = item.shift || 'Other';
      if (!acc[shift]) acc[shift] = [];
      acc[shift].push(item);
      return acc;
    }, {});

    // Sort shifts
    const shiftOrder = ['Shift 0', 'Shift 1', 'Shift 2'];
    return Object.keys(grouped)
      .sort((a, b) => {
        const aIndex = shiftOrder.indexOf(a);
        const bIndex = shiftOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      .map(key => ({
        title: key,
        data: grouped[key].sort((a, b) => a.employeeName.localeCompare(b.employeeName))
      }));
  }, [planningData, selectedDate, searchQuery]);

  // Total employees for selected date
  const totalEmployees = useMemo(() => {
    return dailyRoster.reduce((sum, section) => sum + section.data.length, 0);
  }, [dailyRoster]);

  // Handlers
  const handlePrevMonth = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentMonth(prev => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentMonth(prev => prev.add(1, 'month'));
  };

  const handleSelectDate = (date) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDate(date.format('YYYY-MM-DD'));
  };

  const handleGoToToday = () => {
    const today = dayjs();
    setCurrentMonth(today);
    setSelectedDate(today.format('YYYY-MM-DD'));

    // Scroll to today
    setTimeout(() => {
      const todayIndex = today.date() - 1;
      dateListRef.current?.scrollToIndex({
        index: todayIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  };

  // Render date item
  const renderDateItem = ({ item }) => {
    const isSelected = item.format('YYYY-MM-DD') === selectedDate;
    const isToday = item.isSame(dayjs(), 'day');
    const isWeekend = [0, 6].includes(item.day());

    return (
      <DateItem
        item={item}
        isSelected={isSelected}
        isToday={isToday}
        isWeekend={isWeekend}
        onPress={() => handleSelectDate(item)}
      />
    );
  };

  const selectedDayFormatted = dayjs(selectedDate).format('dddd, D MMMM');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
          },
        ]}
      >
        {/* Month Navigation */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleGoToToday} style={styles.monthCenter}>
            <Text style={styles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>
            <View style={styles.todayHint}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.primaryLight} />
              <Text style={styles.todayHintText}>Tap for today</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Date Strip */}
        <View style={styles.dateStrip}>
          <FlatList
            ref={dateListRef}
            data={daysInMonth}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.toString()}
            renderItem={renderDateItem}
            contentContainerStyle={styles.dateListContent}
            getItemLayout={(data, index) => ({
              length: DATE_ITEM_WIDTH + 8,
              offset: (DATE_ITEM_WIDTH + 8) * index,
              index,
            })}
            initialScrollIndex={Math.max(0, dayjs().date() - 3)}
            onScrollToIndexFailed={() => {}}
          />
        </View>

        {/* Selected Date Info */}
        <View style={styles.selectedDateRow}>
          <View style={styles.selectedDateInfo}>
            <Ionicons name="calendar" size={18} color={COLORS.primary} />
            <Text style={styles.selectedDateText}>{selectedDayFormatted}</Text>
          </View>
          <View style={styles.totalBadge}>
            <Ionicons name="people" size={14} color={COLORS.primaryLight} />
            <Text style={styles.totalText}>{totalEmployees} scheduled</Text>
          </View>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[
          styles.searchContainer,
          searchFocused && styles.searchContainerFocused
        ]}>
          <Ionicons
            name="search"
            size={20}
            color={searchFocused ? COLORS.primary : COLORS.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      ) : dailyRoster.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Shifts Scheduled</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No results found for "${searchQuery}"`
              : 'There are no shifts scheduled for this day'}
          </Text>
          {searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={dailyRoster}
          keyExtractor={item => item.title}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPlanning(true)}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          renderItem={({ item }) => (
            <ShiftSection
              shift={item.title}
              employees={item.data}
              currentUser={user}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Month Navigation
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthCenter: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  todayHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  todayHintText: {
    fontSize: 11,
    color: COLORS.primaryLight,
  },

  // Date Strip
  dateStrip: {
    height: 80,
    marginTop: 8,
  },
  dateListContent: {
    paddingHorizontal: 12,
  },
  dateItem: {
    width: DATE_ITEM_WIDTH,
    height: 72,
    marginHorizontal: 4,
  },
  dateItemGradient: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  dateItemInner: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
  },
  dateItemToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  dateDayName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  textWhite: {
    color: '#fff',
  },
  textWeekend: {
    color: COLORS.danger,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },

  // Selected Date Row
  selectedDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },

  // Search
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.cardElevated,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  clearButton: {
    padding: 4,
  },

  // Center Container (Loading / Empty)
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearSearchButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  clearSearchText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // List Content
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Shift Section
  shiftSection: {
    marginBottom: 24,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shiftIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  shiftLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Employee Card
  employeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  myCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  employeeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  employeeInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  employeeId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});