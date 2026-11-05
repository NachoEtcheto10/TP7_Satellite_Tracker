import type { GeoPoint, SatellitePosition } from '@/domain/types';

export type NativeMapProps = {
  satelliteName?: string;
  position: SatellitePosition | null;
  track: GeoPoint[][];
  coverage: GeoPoint[][];
  constellation: { noradId: number; name: string; position: SatellitePosition }[];
};

export declare function NativeMap(props: NativeMapProps): React.JSX.Element;
