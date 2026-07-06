import * as Notifications from 'expo-notifications';
import { RecurrenceFrequency } from '@/lib/storage';

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelNotification(id?: string): Promise<void> {
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/**
 * Fires a local notification the first time spend crosses 80%, then again at
 * 100%. Returns the watermark to persist so it doesn't re-fire on reload.
 */
export async function checkBudgetThreshold(
  spent: number,
  budget: number,
  notified: number,
): Promise<number> {
  if (budget <= 0) return notified;
  const pct = (spent / budget) * 100;

  if (pct >= 100 && notified < 100) {
    if (await requestNotificationPermission()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Presupuesto agotado',
          body: 'Ya superaste el 100% de tu presupuesto mensual.',
          sound: true,
        },
        trigger: null,
      });
    }
    return 100;
  }

  if (pct >= 80 && notified < 80) {
    if (await requestNotificationPermission()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Presupuesto al 80%',
          body: 'Vas en el 80% de tu presupuesto mensual. Ya casi llegas al límite.',
          sound: true,
        },
        trigger: null,
      });
    }
    return 80;
  }

  return notified;
}

export async function scheduleRecurringReminder(
  expenseName: string,
  frequency: RecurrenceFrequency,
  baseDate: Date,
): Promise<string | undefined> {
  if (!(await requestNotificationPermission())) return undefined;

  const content = {
    title: 'Gasto recurrente',
    body: `Recuerda registrar: ${expenseName}`,
    sound: true,
  };

  if (frequency === 'weekly') {
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: baseDate.getDay() + 1, // Expo: 1 = domingo … 7 = sábado
        hour: 9,
        minute: 0,
      },
    });
  }

  return Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: baseDate.getDate(),
      hour: 9,
      minute: 0,
    },
  });
}
