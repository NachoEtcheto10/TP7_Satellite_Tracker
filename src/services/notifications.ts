import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { PassWindow, SatelliteRecord } from '@/domain/types';

const CHANNEL = 'satellite-passes';

export async function prepareNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Pases satelitales',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#22D3C5',
    });
  }
}

export async function schedulePassNotification(record: SatelliteRecord, pass: PassWindow, minutesBefore: number): Promise<string> {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Android no autorizó las notificaciones.');
  let delivery: Notifications.NotificationDelivery = 'bestEffort';
  if (Platform.OS === 'android') {
    const exact = await Notifications.getExactAlarmPermissionsAsync();
    const resolved = exact.granted ? exact : await Notifications.requestExactAlarmPermissionsAsync();
    if (resolved.granted) delivery = 'alarmClock';
  }
  const triggerAt = new Date(pass.aos.getTime() - minutesBefore * 60_000);
  if (triggerAt.getTime() <= Date.now()) throw new Error('El instante del recordatorio ya pasó.');
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Pase de ${record.name}`,
      body: `AOS en ${minutesBefore} min. Elevación máxima prevista: ${pass.maxElevationDeg.toFixed(1)}°`,
      data: { noradId: record.noradId, aos: pass.aos.toISOString() },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerAt, channelId: CHANNEL, delivery },
  });
}

export async function scheduleTestNotification(delaySeconds = 5): Promise<string> {
  await prepareNotifications();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Android no autorizó las notificaciones.');
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Orbita · notificación de prueba',
      body: 'Canal local verificado. Esta alerta no representa un pase satelital.',
      data: { test: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, delaySeconds),
      channelId: CHANNEL,
    },
  });
}

export async function cancelPassNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}
