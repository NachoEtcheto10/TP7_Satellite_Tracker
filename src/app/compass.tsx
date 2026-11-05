import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { angularDifferenceDegrees, normalizeDegrees } from '@/domain/orbital';
import { useTrackerStore } from '@/state/useTrackerStore';
import { ActionButton, Metric, ScreenHeader, StatusLine } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

export default function CompassScreen() {
  const look = useTrackerStore((s) => s.look);
  const observer = useTrackerStore((s) => s.observer);
  const locate = useTrackerStore((s) => s.locateObserver);
  const [heading, setHeading] = useState<number | null>(null);
  const [tilt, setTilt] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [available, setAvailable] = useState<boolean | null>(() => Platform.OS === 'web' ? false : null);
  const { width } = useWindowDimensions();
  const dialSize = Math.max(200, Math.min(280, width - spacing.lg * 2));

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    let headingSubscription: Location.LocationSubscription | undefined;
    let motionSubscription: { remove(): void } | undefined;
    void Location.watchHeadingAsync(({ accuracy: nextAccuracy, magHeading, trueHeading }) => {
      if (!mounted) return;
      setAvailable(true);
      setAccuracy(nextAccuracy);
      setHeading(normalizeDegrees(trueHeading >= 0 ? trueHeading : magHeading));
    }, () => { if (mounted) setAvailable(false); }).then((subscription) => {
      if (mounted) headingSubscription = subscription;
      else subscription.remove();
    }).catch(() => { if (mounted) setAvailable(false); });
    void DeviceMotion.isAvailableAsync().then((motion) => {
      if (!mounted || !motion) return;
      DeviceMotion.setUpdateInterval(120);
      motionSubscription = DeviceMotion.addListener(({ rotation }) => setTilt(rotation.beta * 180 / Math.PI));
    });
    return () => { mounted = false; headingSubscription?.remove(); motionSubscription?.remove(); };
  }, []);

  const turn = look && heading !== null ? angularDifferenceDegrees(look.azimuthDeg, heading) : null;
  return <SafeAreaView style={styles.safe}>
    <ScreenHeader eyebrow="Sensores del dispositivo" title="Orientación asistida" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.dial, { width: dialSize, height: dialSize, borderRadius: dialSize / 2 }]}>
        <Text style={styles.north}>N</Text>
        <View style={[styles.needle, { height: dialSize * 0.8, transform: [{ rotate: `${turn ?? 0}deg` }] }]}><View style={styles.needleHead} /></View>
        <View style={styles.center}><Text style={styles.turn}>{turn === null ? '—' : `${Math.abs(turn).toFixed(0)}°`}</Text><Text style={styles.turnLabel}>{turn === null ? 'SIN SEÑAL' : Math.abs(turn) < 4 ? 'ALINEADO' : turn > 0 ? 'GIRAR DERECHA' : 'GIRAR IZQUIERDA'}</Text></View>
      </View>
      <View style={styles.metrics}>
        <Metric label="Rumbo" value={heading?.toFixed(1) ?? '—'} unit="°" />
        <Metric label="Azimut objetivo" value={look?.azimuthDeg.toFixed(1) ?? '—'} unit="°" />
        <Metric label="Elevación" value={look?.elevationDeg.toFixed(1) ?? '—'} unit="°" />
      </View>
      <View style={styles.tilt}><Text style={styles.tiltLabel}>INCLINACIÓN DEL DISPOSITIVO</Text><View style={styles.tiltTrack}><View style={[styles.tiltMarker, { left: `${Math.max(0, Math.min(100, ((tilt ?? 0) + 90) / 180 * 100))}%` }]} /></View><Text style={styles.tiltValue}>{tilt?.toFixed(1) ?? '—'}° · objetivo {look?.elevationDeg.toFixed(1) ?? '—'}°</Text></View>
      {!observer && <ActionButton label="Obtener ubicación GPS" onPress={() => void locate()} />}
      <StatusLine tone={available === false ? 'danger' : available ? accuracy === 0 ? 'warning' : 'success' : 'muted'} label={available === false ? 'Este dispositivo no informa una brújula utilizable.' : available ? `Brújula activa · calibración ${accuracy === 3 ? 'alta' : accuracy === 2 ? 'media' : accuracy === 1 ? 'baja' : 'insuficiente'}.` : 'Comprobando sensores…'} />
      <Text style={styles.note}>{Platform.OS === 'android' ? 'La orientación es magnética y la elevación del dispositivo es una guía aproximada. La precisión depende de la calibración y del montaje del teléfono.' : 'La orientación requiere sensores físicos del dispositivo.'}</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg, justifyContent: 'center' },
  dial: { alignSelf: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  north: { position: 'absolute', top: 15, color: colors.primary, fontFamily: type.mono, fontWeight: '700', letterSpacing: 1 },
  needle: { position: 'absolute', width: 2, alignItems: 'center' },
  needleHead: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 60, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.warning },
  center: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  turn: { color: colors.text, fontFamily: type.mono, fontSize: 30, fontWeight: '600', fontVariant: ['tabular-nums'] },
  turnLabel: { color: colors.primary, fontSize: 9, fontWeight: '700', letterSpacing: 1.1, marginTop: 5 },
  metrics: { flexDirection: 'row', gap: 12 },
  tilt: { gap: 8 },
  tiltLabel: { color: colors.subtle, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  tiltTrack: { height: 4, backgroundColor: colors.border },
  tiltMarker: { position: 'absolute', top: -5, width: 3, height: 14, backgroundColor: colors.primary },
  tiltValue: { color: colors.muted, fontFamily: type.mono, fontSize: 12 },
  note: { color: colors.subtle, fontSize: 11, lineHeight: 16 },
});
