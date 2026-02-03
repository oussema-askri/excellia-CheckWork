import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

import HomeScreen from '../screens/HomeScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import PlanningScreen from '../screens/PlanningScreen';
import PresenceScreen from '../screens/PresenceScreen';
import ProfileScreen from '../screens/ProfileScreen'; // ✅ NEW

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Attendance') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Planning') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Feuille') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Planning" component={PlanningScreen} options={{ title: 'Planning' }} />
      <Tab.Screen name="Feuille" component={PresenceScreen} options={{ title: 'Sheets' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}