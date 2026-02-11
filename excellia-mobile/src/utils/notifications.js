import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import dayjs from 'dayjs';

// 1. Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Register
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    // console.log('Must use physical device for Push Notifications');
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Permission required', 'Please enable notifications for shift reminders.');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return true;
}

// 3. Schedule Dynamic Shift Reminders
export async function scheduleShiftReminders(planningItems) {
  // Cancel all previous shift reminders to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  console.log(`📅 Scheduling reminders for ${planningItems.length} shifts...`);

  let count = 0;
  const now = dayjs();

  for (const item of planningItems) {
    const dateStr = dayjs(item.date).format('YYYY-MM-DD');
    const startStr = item.startTime; // "08:00"
    const endStr = item.endTime;     // "17:00"

    // Parse Start Time
    const [startH, startM] = startStr.split(':');
    const shiftStart = dayjs(dateStr).hour(startH).minute(startM);
    
    // Parse End Time (handle overnight next)
    const [endH, endM] = endStr.split(':');
    let shiftEnd = dayjs(dateStr).hour(endH).minute(endM);
    if (shiftEnd.isBefore(shiftStart)) {
      shiftEnd = shiftEnd.add(1, 'day');
    }

    // Reminder Times (30 mins before)
    const remindStart = shiftStart.subtract(30, 'minute');
    const remindEnd = shiftEnd.subtract(30, 'minute');

    // Only schedule if time is in the future
    if (remindStart.isAfter(now)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Shift Starting Soon",
          body: `Your shift starts at ${startStr}. Don't forget to check in!`,
          sound: true,
        },
        trigger: { date: remindStart.toDate() },
      });
      count++;
    }

    if (remindEnd.isAfter(now)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "👋 Shift Ending Soon",
          body: `Your shift ends at ${endStr}. Remember to check out!`,
          sound: true,
        },
        trigger: { date: remindEnd.toDate() },
      });
      count++;
    }
  }

  console.log(`✅ Scheduled ${count} notifications.`);
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}