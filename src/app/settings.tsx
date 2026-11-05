import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { orbitalAgeHours } from '@/domain/orbital';
import { scheduleTestNotification } from '@/services/notifications';
import { useTrackerStore } from '@/state/useTrackerStore';
import { ActionButton, Metric, ScreenHeader, Section, StatusLine } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

export default function SettingsScreen() {
  const observer = useTrackerStore((s) => s.observer);
  const selected = useTrackerStore((s) => s.selected);
  const minElevation = useTrackerStore((s) => s.minElevationDeg);
  const lead = useTrackerStore((s) => s.notificationLeadMinutes);
  const validation = useTrackerStore((s) => s.validation);
  const setManual = useTrackerStore((s) => s.setManualObserver);
  const locate = useTrackerStore((s) => s.locateObserver);
  const setMinimum = useTrackerStore((s) => s.setMinElevation);
  const setLead = useTrackerStore((s) => s.setNotificationLead);
  const validate = useTrackerStore((s) => s.validate);
  const [latitude, setLatitude] = useState(() => observer ? String(observer.latitude) : '');
  const [longitude, setLongitude] = useState(() => observer ? String(observer.longitude) : '');
  const [altitude, setAltitude] = useState(() => observer ? String(observer.altitudeMeters) : '0');
  const [notificationTest, setNotificationTest] = useState<string | null>(null);
  const locateAndFill = async () => {
    await locate();
    const next = useTrackerStore.getState().observer;
    if (next) { setLatitude(String(next.latitude)); setLongitude(String(next.longitude)); setAltitude(String(next.altitudeMeters)); }
  };
  const age = selected ? orbitalAgeHours(selected) : null;

  return <SafeAreaView style={styles.safe}>
    <ScreenHeader eyebrow="Configuración y evidencia" title="Ajustes" />
    <ScrollView keyboardShouldPersistTaps="handled">
      <Section>
        <Text style={styles.sectionTitle}>OBSERVADOR</Text>
        <StatusLine tone={observer ? 'success' : 'warning'} label={observer ? `${observer.source === 'gps' ? 'GPS' : 'Manual'} · ${observer.latitude.toFixed(5)}, ${observer.longitude.toFixed(5)} · ${observer.altitudeMeters.toFixed(0)} m` : 'Todavía no hay una ubicación de observador.'} />
        <View style={styles.row}><ActionButton label="Actualizar GPS" onPress={() => void locateAndFill()} /><ActionButton label="Guardar manual" tone="quiet" onPress={() => setManual(Number(latitude.replace(',', '.')), Number(longitude.replace(',', '.')), Number(altitude.replace(',', '.')))} /></View>
        <View style={styles.inputs}>
          <Field label="Latitud" value={latitude} onChange={setLatitude} />
          <Field label="Longitud" value={longitude} onChange={setLongitude} />
          <Field label="Altitud m" value={altitude} onChange={setAltitude} />
        </View>
      </Section>
      <Section>
        <Text style={styles.sectionTitle}>UMBRALES</Text>
        <View style={styles.metrics}><Metric label="Elevación mínima" value={String(minElevation)} unit="°" /><Metric label="Aviso previo" value={String(lead)} unit="min" /></View>
        <View style={styles.row}>{[5, 10, 20].map((value) => <ActionButton key={value} label={`${value}°`} tone={minElevation === value ? 'primary' : 'quiet'} onPress={() => setMinimum(value)} />)}</View>
        <View style={styles.row}>{[5, 10, 20].map((value) => <ActionButton key={value} label={`${value} min`} tone={lead === value ? 'primary' : 'quiet'} onPress={() => setLead(value)} />)}</View>
      </Section>
      <Section>
        <Text style={styles.sectionTitle}>ANTIGÜEDAD DE DATOS</Text>
        {selected ? <>
          <StatusLine tone={age !== null && age > 48 ? 'warning' : 'success'} label={`Época orbital: ${selected.epoch.toISOString()}`} />
          <StatusLine tone="muted" label={`Edad orbital: ${age?.toFixed(2)} h · última descarga: ${selected.downloadedAt.toISOString()}`} />
          <Text style={styles.note}>La edad orbital mide desde la época del elemento; la edad de descarga mide la caché local. Son magnitudes distintas.</Text>
        </> : <StatusLine tone="warning" label="No hay elementos orbitales seleccionados." />}
      </Section>
      <Section>
        <Text style={styles.sectionTitle}>PRUEBA DE NOTIFICACIONES</Text>
        <ActionButton label="Programar prueba en 5 s" tone="quiet" onPress={() => {
          setNotificationTest('Programando alerta local…');
          void scheduleTestNotification(5)
            .then(() => setNotificationTest('Prueba programada. Salí de la app para verla en Android.'))
            .catch((error) => setNotificationTest(error instanceof Error ? error.message : String(error)));
        }} />
        {notificationTest && <Text style={styles.note}>{notificationTest}</Text>}
      </Section>
      <Section>
        <Text style={styles.sectionTitle}>VALIDACIÓN INDEPENDIENTE</Text>
        <View style={styles.row}><ActionButton label="Where the ISS at?" tone="quiet" disabled={selected?.noradId !== 25544} onPress={() => void validate('wheretheiss')} /><ActionButton label="N2YO" tone="quiet" onPress={() => void validate('n2yo')} /></View>
        {validation ? <View style={styles.validation}>
          <Metric label="Distancia superficial" value={validation.distanceKm.toFixed(2)} unit="km" />
          <Metric label="Diferencia altitud" value={validation.altitudeDifferenceKm?.toFixed(2) ?? '—'} unit="km" />
          <Metric label="Δ timestamps" value={validation.timestampDifferenceSeconds.toFixed(1)} unit="s" />
          <Text style={styles.note}>Proveedor: {validation.provider}. La posición local se propagó al timestamp remoto; el error incluye diferencias de elementos y modelos del proveedor.</Text>
        </View> : <Text style={styles.note}>N2YO requiere el proxy y N2YO_API_KEY. Si faltan, la app informa la integración pendiente y no fabrica una medición.</Text>}
      </Section>
    </ScrollView>
  </SafeAreaView>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType="numbers-and-punctuation" style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  sectionTitle: { color: colors.primary, fontFamily: type.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  inputs: { flexDirection: 'row', gap: 8, marginTop: 14 },
  fieldLabel: { color: colors.subtle, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.surface, paddingHorizontal: 9, fontFamily: type.mono, fontSize: 12 },
  metrics: { flexDirection: 'row', gap: spacing.md },
  note: { color: colors.subtle, fontSize: 11, lineHeight: 17, marginTop: 10 },
  validation: { marginTop: 16, gap: 8 },
});
