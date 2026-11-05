import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrackerStore } from '@/state/useTrackerStore';
import { cancelPassNotification, schedulePassNotification } from '@/services/notifications';
import { ActionButton, Metric, ScreenHeader, StatusLine } from '@/ui/components';
import { SkyChart } from '@/ui/SkyChart';
import { colors, spacing, type } from '@/ui/theme';

export default function PassesScreen() {
  const selected = useTrackerStore((s) => s.selected);
  const observer = useTrackerStore((s) => s.observer);
  const passes = useTrackerStore((s) => s.passes);
  const calculate = useTrackerStore((s) => s.calculatePasses);
  const lead = useTrackerStore((s) => s.notificationLeadMinutes);
  const locate = useTrackerStore((s) => s.locateObserver);
  const [notice, setNotice] = useState<string | null>(null);
  const [notificationIds, setNotificationIds] = useState<Record<string, string>>({});
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void Notifications.getAllScheduledNotificationsAsync().then((scheduled) => {
      const restored: Record<string, string> = {};
      for (const request of scheduled) {
        const aos = request.content.data?.aos;
        if (typeof aos === 'string') restored[aos] = request.identifier;
      }
      setNotificationIds(restored);
    });
  }, []);
  return <SafeAreaView style={styles.safe}>
    <ScreenHeader eyebrow="AOS · MAX · LOS" title="Próximos pases" />
    {!observer ? <View style={styles.prompt}>
      <StatusLine tone="warning" label="Hace falta un observador real para calcular visibilidad." />
      <ActionButton label="Usar ubicación GPS" onPress={() => void locate()} />
    </View> : !passes.length ? <View style={styles.prompt}>
      <StatusLine label={`Sin pases encontrados en 72 h sobre ${useTrackerStore.getState().minElevationDeg}°.`} />
      <ActionButton label="Recalcular 72 h" onPress={calculate} tone="quiet" />
    </View> : <FlatList
      data={passes} keyExtractor={(item) => item.aos.toISOString()}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => <View style={styles.pass}>
        <Text style={styles.passIndex}>PASE {String(index + 1).padStart(2, '0')}{item.inProgress ? ' · EN CURSO' : ''}</Text>
        <Text style={styles.date}>{item.aos.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })}</Text>
        <View style={styles.metrics}>
          <Metric label="AOS" value={item.aos.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
          <Metric label="Máxima" value={item.maxElevationDeg.toFixed(1)} unit="°" />
          <Metric label="LOS" value={item.los.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
        </View>
        {index === 0 && <SkyChart pass={item} size={280} />}
        <ActionButton label={notificationIds[item.aos.toISOString()] ? 'Cancelar recordatorio' : `Recordar ${lead} min antes`} tone="quiet" onPress={() => {
          if (!selected) return;
          const key = item.aos.toISOString();
          const existing = notificationIds[key];
          if (existing) {
            void cancelPassNotification(existing).then(() => { setNotificationIds((current) => { const next = { ...current }; delete next[key]; return next; }); setNotice('Recordatorio cancelado.'); });
          } else {
            void schedulePassNotification(selected, item, lead).then((id) => { setNotificationIds((current) => ({ ...current, [key]: id })); setNotice('Recordatorio local programado.'); }).catch((error) => setNotice(error instanceof Error ? error.message : String(error)));
          }
        }} />
        {index === 0 && notice && <Text style={styles.notice}>{notice}</Text>}
      </View>}
    />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  prompt: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  list: { paddingBottom: spacing.xl },
  pass: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  passIndex: { color: colors.primary, fontFamily: type.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  date: { color: colors.text, fontSize: 19, fontWeight: '600', textTransform: 'capitalize' },
  metrics: { flexDirection: 'row', gap: 12 },
  notice: { color: colors.warning, fontSize: 12, lineHeight: 18 },
});
