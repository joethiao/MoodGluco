import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const MEDICATION_CHANNEL_ID = 'medication-reminders';
export const MEDICATION_PRECALL_TYPE = 'medication_precall_alarm';
const MEDICATION_CALL_CATEGORY_ID = 'MEDICATION_CALL';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let isInitialized = false;

export const initNotifications = async () => {
  if (isInitialized) return true;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_ID, {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 700, 220, 700, 220, 900],
      lightColor: '#FF6B35',
      sound: 'default',
    });
  }

  await Notifications.setNotificationCategoryAsync(MEDICATION_CALL_CATEGORY_ID, [
    {
      identifier: 'open_call',
      buttonTitle: 'Ouvrir appel',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Ignorer',
      options: { isDestructive: true },
    },
  ]);

  isInitialized = true;
  return true;
};

export const sendLocalNotification = async ({ title, body, data = {} }) => {
  const granted = await initNotifications();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      categoryIdentifier: MEDICATION_CALL_CATEGORY_ID,
    },
    trigger: null,
  });

  return true;
};

const parseTime = (hhmm) => {
  const [h, m] = (hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hour: h, minute: m };
};

const minusFiveMinutes = (hour, minute) => {
  const total = hour * 60 + minute;
  const shifted = (total - 5 + 24 * 60) % (24 * 60);
  return { hour: Math.floor(shifted / 60), minute: shifted % 60 };
};

export const syncMedicationPrecallNotifications = async (medications = []) => {
  const granted = await initNotifications();
  if (!granted) return false;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter(
    (n) => n.content?.data?.type === MEDICATION_PRECALL_TYPE
  );

  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));

  for (const med of medications) {
    const times = Array.isArray(med.schedule) ? med.schedule : [];
    for (const time of times) {
      const parsed = parseTime(time);
      if (!parsed) continue;
      const triggerTime = minusFiveMinutes(parsed.hour, parsed.minute);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Appel entrant: Mes medicaments',
          body: `${med.name} dans 5 min (${time}). Touchez pour ouvrir l'appel.`,
          data: {
            type: MEDICATION_PRECALL_TYPE,
            medId: med.id,
            medicationName: med.name,
            scheduledTime: time,
          },
          sound: 'default',
          categoryIdentifier: MEDICATION_CALL_CATEGORY_ID,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: triggerTime.hour,
          minute: triggerTime.minute,
          channelId: MEDICATION_CHANNEL_ID,
        },
      });
    }
  }

  return true;
};
