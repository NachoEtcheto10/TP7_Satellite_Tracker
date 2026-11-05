import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from './theme';

export function ScreenHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <View style={styles.header}>
    <View style={{ flex: 1 }}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text></View>
    {action}
  </View>;
}

export function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.metricValue}>{value}<Text style={styles.metricUnit}>{unit ? ` ${unit}` : ''}</Text></Text>
  </View>;
}

export function ActionButton({ label, onPress, disabled = false, tone = 'primary' }: {
  label: string; onPress(): void; disabled?: boolean; tone?: 'primary' | 'quiet' | 'warning';
}) {
  return <Pressable
    accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, tone === 'quiet' && styles.buttonQuiet, tone === 'warning' && styles.buttonWarning, disabled && styles.disabled, pressed && styles.pressed]}
  ><Text style={[styles.buttonText, tone === 'quiet' && styles.buttonQuietText]}>{label}</Text></Pressable>;
}

export function StatusLine({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'danger' | 'warning' | 'success' }) {
  const color = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.muted;
  return <View style={styles.status}><View style={[styles.statusDot, { backgroundColor: color }]} /><Text style={[styles.statusText, { color }]}>{label}</Text></View>;
}

export function LoadingBlock({ label = 'Cargando datos reales…' }: { label?: string }) {
  return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>{label}</Text></View>;
}

export function Section({ children }: PropsWithChildren) { return <View style={styles.section}>{children}</View>; }

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.sm, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.primary, borderRadius: radius.lg },
  eyebrow: { color: '#E9D5FF', fontSize: 13, fontWeight: '500', marginBottom: 2 },
  title: { color: colors.onPrimary, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  metric: { minWidth: 0, flex: 1, backgroundColor: colors.surfaceRaised, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  metricValue: { color: colors.primaryDark, fontFamily: type.mono, fontSize: 18, lineHeight: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metricUnit: { color: colors.muted, fontSize: 11, fontWeight: '400' },
  button: { minHeight: 50, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.warning, borderRadius: radius.pill, elevation: 2 },
  buttonQuiet: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, elevation: 0 },
  buttonWarning: { backgroundColor: colors.primaryDark },
  buttonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '800' },
  buttonQuietText: { color: colors.primary },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.98 }] },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { flex: 1, fontSize: 12, lineHeight: 17 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  loadingText: { color: colors.muted, fontSize: 13 },
  section: { margin: spacing.sm, marginBottom: 0, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
});
