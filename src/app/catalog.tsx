import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { SatelliteCategory } from '@/domain/types';
import { useTrackerStore } from '@/state/useTrackerStore';
import { LoadingBlock, ScreenHeader } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

const categories: { id: SatelliteCategory; label: string }[] = [
  { id: 'stations', label: 'ISS y estaciones' }, { id: 'starlink', label: 'Starlink' },
  { id: 'gps', label: 'GPS' }, { id: 'weather', label: 'Meteorológicos' }, { id: 'active', label: 'Activos' },
];

export default function CatalogScreen() {
  const [query, setQuery] = useState('');
  const catalog = useTrackerStore((s) => s.catalog);
  const category = useTrackerStore((s) => s.category);
  const loading = useTrackerStore((s) => s.loading);
  const loadCatalog = useTrackerStore((s) => s.loadCatalog);
  const selectSatellite = useTrackerStore((s) => s.selectSatellite);
  useEffect(() => { if (!catalog.length) void loadCatalog('stations'); }, [catalog.length, loadCatalog]);
  const normalized = query.trim().toLocaleLowerCase('es');
  const results = useMemo(() => {
    if (!normalized) return catalog;
    return catalog.filter((item) => item.name.toLocaleLowerCase('es').includes(normalized) || String(item.noradId).includes(normalized));
  }, [catalog, normalized]);

  return <SafeAreaView style={styles.safe}>
    <ScreenHeader eyebrow="Fuente: CelesTrak OMM" title="Explorar satélites" />
    <TextInput
      accessibilityLabel="Buscar por nombre o NORAD ID" value={query} onChangeText={setQuery}
      placeholder="Nombre o NORAD ID…" placeholderTextColor={colors.subtle}
      autoCorrect={false} spellCheck={false} returnKeyType="search" style={styles.search}
    />
    <FlatList
      horizontal data={categories} keyExtractor={(item) => item.id}
      style={styles.filtersList}
      showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}
      renderItem={({ item }) => <Pressable
        accessibilityRole="button" onPress={() => void loadCatalog(item.id)}
        style={[styles.chip, category === item.id && styles.chipActive]}
      ><Text style={[styles.chipText, category === item.id && styles.chipTextActive]}>{item.label}</Text></Pressable>}
    />
    {loading && !catalog.length ? <LoadingBlock label="Descargando catálogo OMM…" /> : <FlatList
      data={results} keyExtractor={(item) => String(item.noradId)} keyboardShouldPersistTaps="handled"
      contentContainerStyle={results.length ? undefined : styles.empty}
      ListEmptyComponent={<Text style={styles.emptyText}>{normalized ? 'No hay coincidencias en este catálogo.' : 'El catálogo no devolvió objetos.'}</Text>}
      renderItem={({ item }) => <Pressable
        accessibilityRole="button"
        onPress={() => { void selectSatellite(item.noradId).then(() => {
          if (useTrackerStore.getState().selected?.noradId === item.noradId) router.replace('/');
        }); }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.name}>{item.name}</Text><Text style={styles.meta}>NORAD {item.noradId} · época {item.epoch.toLocaleDateString('es-AR')}</Text></View>
        <Text style={styles.select}>SEGUIR</Text>
      </Pressable>}
    />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  search: { margin: spacing.md, minHeight: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, fontSize: 15 },
  filtersList: { flexGrow: 0 },
  filters: { paddingHorizontal: spacing.md, gap: 8, paddingBottom: 14 },
  chip: { height: 36, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 18 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.canvas },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowPressed: { backgroundColor: colors.surfaceRaised },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.subtle, fontFamily: type.mono, fontSize: 11, marginTop: 5 },
  select: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 22 },
});
