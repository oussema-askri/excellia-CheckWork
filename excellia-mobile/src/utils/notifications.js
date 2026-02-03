import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// 1. Configure handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Request Permissions (Simple version for Local only)
export async function registerForPushNotificationsAsync() {
  // We don't check Device.isDevice or get push tokens anymore
  // to avoid Expo Go SDK 53 errors.
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Permission required', 'Please enable notifications in settings to use reminders.');
    return false;
  }

  // On Android, we need a channel for local notifications to appear.
  // We try-catch this because Expo Go SDK 53 might complain, 
  // but usually basic local channels are allowed.
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (e) {
      console.log('Error setting channel (might be Expo Go limitation):', e);
    }
  }

  return true;
}

// 3. Schedule
/*export async function scheduleDailyReminders() {
  await cancelAllReminders();

  try {
    // Check In - 08:30
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "☀️ Good Morning!",
        body: "Don't forget to check in on Excellia.",
      },
      trigger: {
        type: 'daily', // Simple string often works better in older/mixed enviros, or use object below
        hour: 20,
        minute: 38,
      },
    });

    // Check Out - 17:00
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "👋 Workday Complete?",
        body: "Remember to check out before you leave.",
      },
      trigger: {
        type: 'daily',
        hour: 20,
        minute: 40,
      },
    });
  } catch (error) {
    console.log('Error scheduling:', error);
    
    // Fallback: If 'daily' type fails (specific to some Expo Go versions),
    // try 'timeInterval' just to prove it works (repeats every 24h)
    // This isn't perfect time-wise but proves permissions work.
    /*
    await Notifications.scheduleNotificationAsync({
      content: { title: "☀️ Check-In Reminder", body: "Don't forget!" },
      trigger: { seconds: 60 * 60 * 24, repeats: true } 
    });
    */
//  }
//}
// src/utils/notifications.js

export async function scheduleDailyReminders() {
  await cancelAllReminders();

  try {
    // TEST NOTIFICATION: Fires in 5 seconds
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Test Reminder",
        body: "This is your test notification!",
        sound: true,
      },
      trigger: {
        seconds: 5, // <--- CHANGE THIS to wait 5 seconds
        repeats: false,
      },
    });
    
    console.log("Notification scheduled for 5 seconds from now");

  } catch (error) {
    console.log('Error scheduling:', error);
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}