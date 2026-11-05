import { Platform } from 'react-native';

// Tema "Aurora Clara": fondo marfil, acentos violeta y coral, tarjetas redondeadas.
export const colors = {
  canvas: '#FAF6EF',
  mapOverlay: 'rgba(255,253,248,0.96)',
  surface: '#FFFFFF',
  surfaceRaised: '#F3ECFF',
  border: '#E4DAF0',
  text: '#241B3A',
  muted: '#6B5F80',
  subtle: '#9A8FAE',
  primary: '#6D28D9',
  primaryDark: '#4C1D95',
  warning: '#F97362',
  danger: '#DC2648',
  success: '#0E9F6E',
  track: '#C026D3',
  footprint: 'rgba(109,40,217,0.12)',
  onPrimary: '#FFFFFF',
};

export const type = {
  mono: Platform.select({ android: 'sans-serif-medium', ios: 'Avenir Next', default: 'system-ui' }),
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const spacing = { xs: 6, sm: 10, md: 18, lg: 26, xl: 34 };

export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#F5F0FA' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B5F80' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#D9CCEB' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#FAF6EF' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#DCEBFA' }] },
];
