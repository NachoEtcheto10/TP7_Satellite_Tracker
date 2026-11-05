import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTrackerStore } from '@/state/useTrackerStore';
import { colors, radius, spacing } from './theme';

export function ErrorBanner() {
  const error = useTrackerStore((s) => s.error);
  const clear = useTrackerStore((s) => s.clearError);
  if (!error) return null;
  return <View accessibilityRole="alert" style={styles.banner}>
    <Text style={styles.text}>{error}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar error" onPress={clear} hitSlop={12}><Text style={styles.close}>Cerrar</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', top: 8, left: spacing.md, right: spacing.md, zIndex: 100, backgroundColor: colors.danger, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, flex: 1 },
  close: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
});
