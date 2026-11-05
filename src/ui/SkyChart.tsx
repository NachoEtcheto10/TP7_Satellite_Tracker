import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { PassWindow } from '@/domain/types';
import { colors } from './theme';

export function SkyChart({ pass, size = 300 }: { pass: PassWindow; size?: number }) {
  const center = size / 2;
  const radius = size * 0.4;
  const points = pass.samples.map((sample) => polar(sample.azimuthDeg, sample.elevationDeg, center, radius));
  const path = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const peak = polar(
    pass.samples.reduce((best, current) => current.elevationDeg > best.elevationDeg ? current : best).azimuthDeg,
    pass.maxElevationDeg, center, radius,
  );
  return <View accessibilityLabel={`Sky chart. Elevación máxima ${pass.maxElevationDeg.toFixed(1)} grados.`} style={styles.wrap}>
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={center} cy={center} r={radius} fill={colors.surfaceRaised} stroke={colors.track} strokeWidth={4} />
      {[30, 60].map((elevation) => <Circle key={elevation} cx={center} cy={center} r={radius * (1 - elevation / 90)} fill="none" stroke="#C4B5FD" strokeWidth={1.5} />)}
      <Line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="#DDD0F5" />
      <Line x1={center - radius} y1={center} x2={center + radius} y2={center} stroke="#DDD0F5" />
      <Path d={path} fill="none" stroke={colors.track} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={peak.x} cy={peak.y} r={8} fill={colors.warning} stroke="#FFFFFF" strokeWidth={3} />
      <SvgText x={center} y={center - radius - 10} fill={colors.text} fontSize="12" textAnchor="middle">N</SvgText>
      <SvgText x={center + radius + 12} y={center + 4} fill={colors.muted} fontSize="12" textAnchor="middle">E</SvgText>
      <SvgText x={center} y={center + radius + 18} fill={colors.muted} fontSize="12" textAnchor="middle">S</SvgText>
      <SvgText x={center - radius - 12} y={center + 4} fill={colors.muted} fontSize="12" textAnchor="middle">O</SvgText>
    </Svg>
  </View>;
}

function polar(azimuthDeg: number, elevationDeg: number, center: number, radius: number) {
  const r = radius * (1 - Math.max(0, Math.min(90, elevationDeg)) / 90);
  const angle = azimuthDeg * Math.PI / 180;
  return { x: center + r * Math.sin(angle), y: center - r * Math.cos(angle) };
}

const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center' } });
