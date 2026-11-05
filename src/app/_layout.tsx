import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { colors } from '@/ui/theme';
import { useTrackerStore } from '@/state/useTrackerStore';
import { prepareNotifications } from '@/services/notifications';

export default function RootLayout() {
  const loadInitial = useTrackerStore((s) => s.loadInitial);
  const tick = useTrackerStore((s) => s.tick);
  useEffect(() => {
    void loadInitial();
    void prepareNotifications();
    const timer = setInterval(() => tick(), 2000);
    return () => clearInterval(timer);
  }, [loadInitial, tick]);
  return <SafeAreaProvider>
    <StatusBar style="dark" />
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: colors.primaryDark, borderTopWidth: 0, borderRadius: 28, height: 66, paddingTop: 8, paddingBottom: 8, elevation: 8 },
      tabBarActiveTintColor: colors.warning,
      tabBarInactiveTintColor: '#C4B5FD',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      sceneStyle: { backgroundColor: colors.canvas, paddingBottom: 84 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Mapa', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="☀" /> }} />
      <Tabs.Screen name="catalog" options={{ title: 'Catálogo', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="✦" /> }} />
      <Tabs.Screen name="passes" options={{ title: 'Pases', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="◷" /> }} />
      <Tabs.Screen name="compass" options={{ title: 'Brújula', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="✥" /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="⚙" /> }} />
    </Tabs>
    <ErrorBanner />
  </SafeAreaProvider>;
}

function TabGlyph({ color, glyph }: { color: ColorValue; glyph: string }) {
  return <Text accessibilityElementsHidden style={{ color, fontSize: 19, lineHeight: 22 }}>{glyph}</Text>;
}
