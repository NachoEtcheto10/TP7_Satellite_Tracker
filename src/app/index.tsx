import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrackerStore } from '@/state/useTrackerStore';
import { ActionButton, LoadingBlock, Metric, ScreenHeader, StatusLine } from '@/ui/components';
import { colors, radius, spacing } from '@/ui/theme';
import { orbitalAgeHours } from '@/domain/orbital';
import { NativeMap } from '@/ui/NativeMap';

export default function MapScreen() {
  const selected = useTrackerStore((s) => s.selected);
  const position = useTrackerStore((s) => s.position);
  const look = useTrackerStore((s) => s.look);
  const track = useTrackerStore((s) => s.groundTrack);
  const coverage = useTrackerStore((s) => s.footprint);
  const constellation = useTrackerStore((s) => s.constellation);
  const loading = useTrackerStore((s) => s.loading);
  const loadConstellation = useTrackerStore((s) => s.loadConstellation);
  const age = selected ? orbitalAgeHours(selected) : null;

  return <SafeAreaView edges={['top']} style={styles.safe}>
    <ScreenHeader eyebrow="Seguimiento orbital" title={selected?.name ?? 'Sin satélite'} />
    <View style={styles.mapWrap}>
      <NativeMap satelliteName={selected?.name} position={position} track={track} coverage={coverage} constellation={constellation} />
      <View style={styles.mapBadge}><StatusLine tone={position ? 'success' : 'warning'} label={position ? `SGP4 local · ${position.timestamp.toLocaleTimeString('es-AR')}` : 'Esperando elementos orbitales'} /></View>
      {loading && !position && <LoadingBlock />}
    </View>
    <View style={styles.panel}>
      <View style={styles.metricsRow}>
        <Metric label="Latitud" value={position ? position.latitude.toFixed(3) : '—'} unit="°" />
        <Metric label="Longitud" value={position ? position.longitude.toFixed(3) : '—'} unit="°" />
        <Metric label="Altitud" value={position?.altitudeKm?.toFixed(1) ?? '—'} unit="km" />
      </View>
      <View style={styles.metricsRow}>
        <Metric label="Velocidad" value={position?.velocityKmS?.toFixed(3) ?? '—'} unit="km/s" />
        <Metric label="Azimut" value={look ? look.azimuthDeg.toFixed(1) : '—'} unit="°" />
        <Metric label="Elevación" value={look ? look.elevationDeg.toFixed(1) : '—'} unit="°" />
      </View>
      <View style={styles.footerRow}>
        <StatusLine tone={age !== null && age > 48 ? 'warning' : 'muted'} label={age === null ? 'Época no disponible' : `Elementos de hace ${age.toFixed(1)} h`} />
        <ActionButton label={constellation.length ? `${constellation.length} Starlink` : 'Capa Starlink'} onPress={() => void loadConstellation(24)} tone="quiet" disabled={loading} />
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  mapWrap: { flex: 1, minHeight: 280, margin: spacing.sm, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#EEE6F8' },
  mapBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: colors.mapOverlay, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, elevation: 3 },
  panel: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.md, gap: 12, elevation: 6 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  footerRow: { alignItems: 'stretch', gap: spacing.sm },
});
