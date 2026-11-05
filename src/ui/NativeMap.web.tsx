import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GeoPoint, SatellitePosition } from '@/domain/types';
import { colors } from './theme';

// Versión web del mapa: MapLibre GL JS cargado desde CDN (misma lógica de capas que la versión nativa).
const MAPLIBRE_VERSION = '4.7.1';
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

type Props = {
  satelliteName?: string;
  position: SatellitePosition | null;
  track: GeoPoint[][];
  coverage: GeoPoint[][];
  constellation: { noradId: number; name: string; position: SatellitePosition }[];
};

declare global { interface Window { maplibregl?: any } }

let loader: Promise<any> | null = null;
function loadMapLibre(): Promise<any> {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    script.onload = () => resolve(window.maplibregl);
    script.onerror = () => { loader = null; reject(new Error('No se pudo cargar MapLibre')); };
    document.head.appendChild(script);
  });
  return loader;
}

const coord = (p: GeoPoint): [number, number] => [p.longitude, p.latitude];
const closeRing = (c: [number, number][]) => {
  const f = c[0]; const l = c[c.length - 1];
  return !f || !l || (f[0] === l[0] && f[1] === l[1]) ? c : [...c, f];
};

function buildData({ satelliteName, position, track, coverage, constellation }: Props) {
  return {
    track: { type: 'FeatureCollection', features: track.filter((s) => s.length > 1).map((s) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: s.map(coord) } })) },
    footprint: { type: 'FeatureCollection', features: coverage.filter((r) => r.length > 2).map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [closeRing(r.map(coord))] } })) },
    starlink: { type: 'FeatureCollection', features: constellation.map((i) => ({ type: 'Feature', properties: { name: i.name }, geometry: { type: 'Point', coordinates: coord(i.position) } })) },
    selected: { type: 'FeatureCollection', features: position ? [{ type: 'Feature', properties: { name: satelliteName ?? '' }, geometry: { type: 'Point', coordinates: coord(position) } }] : [] },
  };
}

export function NativeMap(props: Props) {
  const container = useRef<any>(null);
  const map = useRef<any>(null);
  const ready = useRef(false);
  const latest = useRef(props);
  const centered = useRef(false);
  const [error, setError] = useState<string | null>(null);
  latest.current = props;

  useEffect(() => {
    let cancelled = false;
    loadMapLibre().then((gl) => {
      if (cancelled || !container.current) return;
      const m = new gl.Map({ container: container.current, style: MAP_STYLE, center: [0, 0], zoom: 1, attributionControl: { compact: true } });
      m.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
      map.current = m;
      m.on('load', () => {
        const data = buildData(latest.current);
        m.addSource('footprint', { type: 'geojson', data: data.footprint });
        m.addLayer({ id: 'footprint-fill', type: 'fill', source: 'footprint', paint: { 'fill-color': colors.primary, 'fill-opacity': 0.16 } });
        m.addLayer({ id: 'footprint-line', type: 'line', source: 'footprint', paint: { 'line-color': colors.primary, 'line-width': 2, 'line-dasharray': [2, 2] } });
        m.addSource('track', { type: 'geojson', data: data.track });
        m.addLayer({ id: 'track-line', type: 'line', source: 'track', paint: { 'line-color': colors.track, 'line-width': 3, 'line-opacity': 0.9 } });
        m.addSource('starlink', { type: 'geojson', data: data.starlink });
        m.addLayer({ id: 'starlink-points', type: 'circle', source: 'starlink', paint: { 'circle-radius': 3.5, 'circle-color': colors.warning, 'circle-stroke-width': 1, 'circle-stroke-color': '#FFFFFF' } });
        m.addSource('selected', { type: 'geojson', data: data.selected });
        m.addLayer({ id: 'selected-halo', type: 'circle', source: 'selected', paint: { 'circle-radius': 16, 'circle-color': colors.track, 'circle-opacity': 0.22 } });
        m.addLayer({ id: 'selected-core', type: 'circle', source: 'selected', paint: { 'circle-radius': 6, 'circle-color': colors.primary, 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' } });
        ready.current = true;
      });
    }).catch((e: Error) => setError(e.message));
    return () => { cancelled = true; ready.current = false; map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    const data = buildData(props);
    (Object.keys(data) as (keyof typeof data)[]).forEach((id) => m.getSource(id)?.setData(data[id]));
    if (props.position && !centered.current) {
      m.jumpTo({ center: coord(props.position), zoom: 1.6 });
      centered.current = true;
    }
  }, [props.position, props.track, props.coverage, props.constellation, props.satelliteName]);

  useEffect(() => { centered.current = false; }, [props.satelliteName]);

  return <View style={styles.wrap}>
    <View ref={container} style={StyleSheet.absoluteFill} />
    {error && <Text style={styles.error}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#EEE6F8' },
  error: { position: 'absolute', bottom: 12, left: 12, color: colors.danger },
});
