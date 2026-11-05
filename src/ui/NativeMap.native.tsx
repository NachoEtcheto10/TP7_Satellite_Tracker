import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { GeoPoint, SatellitePosition } from '@/domain/types';
import { colors } from './theme';

const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

type Props = {
  satelliteName?: string;
  position: SatellitePosition | null;
  track: GeoPoint[][];
  coverage: GeoPoint[][];
  constellation: { noradId: number; name: string; position: SatellitePosition }[];
};

export function NativeMap({ satelliteName, position, track, coverage, constellation }: Props) {
  const trackData = useMemo<FeatureCollection<LineString>>(() => ({
    type: 'FeatureCollection',
    features: track.filter((segment) => segment.length > 1).map((segment, index) => ({
      type: 'Feature', id: `track-${index}`, properties: {},
      geometry: { type: 'LineString', coordinates: segment.map(toCoordinate) },
    })),
  }), [track]);
  const footprintData = useMemo<FeatureCollection<Polygon>>(() => ({
    type: 'FeatureCollection',
    features: coverage.filter((ring) => ring.length > 2).map((ring, index) => ({
      type: 'Feature', id: `footprint-${index}`, properties: {},
      geometry: { type: 'Polygon', coordinates: [closeRing(ring.map(toCoordinate))] },
    })),
  }), [coverage]);
  const constellationData = useMemo<FeatureCollection<Point>>(() => ({
    type: 'FeatureCollection',
    features: constellation.map((item) => ({
      type: 'Feature', id: item.noradId, properties: { name: item.name },
      geometry: { type: 'Point', coordinates: toCoordinate(item.position) },
    })),
  }), [constellation]);
  const selectedData = useMemo<FeatureCollection<Point>>(() => ({
    type: 'FeatureCollection',
    features: position ? [{
      type: 'Feature', id: 'selected', properties: { name: satelliteName ?? '' },
      geometry: { type: 'Point', coordinates: toCoordinate(position) },
    }] : [],
  }), [position, satelliteName]);

  return <Map
    key={position ? satelliteName ?? 'selected' : 'pending'}
    style={StyleSheet.absoluteFill}
    mapStyle={OPEN_FREE_MAP_STYLE}
    attribution attributionPosition={{ bottom: 8, right: 8 }}
    logo logoPosition={{ bottom: 8, left: 8 }} compass={false}
  >
    <Camera initialViewState={{ center: position ? toCoordinate(position) : [0, 0], zoom: position ? 1.35 : 0.7, bearing: 0, pitch: 0 }} />
    <GeoJSONSource id="orbita-footprints" data={footprintData}>
      <Layer id="orbita-footprints-fill" type="fill" paint={{ 'fill-color': colors.primary, 'fill-opacity': 0.16 }} />
      <Layer id="orbita-footprints-line" type="line" paint={{ 'line-color': colors.primary, 'line-width': 2, 'line-dasharray': [2, 2] }} />
    </GeoJSONSource>
    <GeoJSONSource id="orbita-track" data={trackData}>
      <Layer id="orbita-track-line" type="line" paint={{ 'line-color': colors.track, 'line-width': 3, 'line-opacity': 0.9 }} />
    </GeoJSONSource>
    <GeoJSONSource id="orbita-starlink" data={constellationData}>
      <Layer id="orbita-starlink-points" type="circle" paint={{ 'circle-radius': 3.5, 'circle-color': colors.warning, 'circle-opacity': 0.95, 'circle-stroke-width': 1, 'circle-stroke-color': '#FFFFFF' }} />
    </GeoJSONSource>
    <GeoJSONSource id="orbita-selected" data={selectedData}>
      <Layer id="orbita-selected-halo" type="circle" paint={{ 'circle-radius': 16, 'circle-color': colors.track, 'circle-opacity': 0.22, 'circle-stroke-width': 1, 'circle-stroke-color': colors.primary }} />
      <Layer id="orbita-selected-core" type="circle" paint={{ 'circle-radius': 6, 'circle-color': colors.primary, 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' }} />
    </GeoJSONSource>
  </Map>;
}

function toCoordinate(point: GeoPoint): [number, number] { return [point.longitude, point.latitude]; }
function closeRing(coordinates: [number, number][]): [number, number][] {
  const first = coordinates[0]; const last = coordinates[coordinates.length - 1];
  if (!first || !last || (first[0] === last[0] && first[1] === last[1])) return coordinates;
  return [...coordinates, first];
}
