import { create } from 'zustand';
import { createSatelliteRecord, propagateSatellite, calculateLookAngles } from '@/domain/orbital';
import { footprint, groundTrack } from '@/domain/geometry';
import { predictPasses } from '@/domain/passes';
import { comparePositions } from '@/domain/validation';
import type {
  CatalogItem, GeoPoint, LookAngles, Observer, PassWindow, SatelliteCategory,
  SatellitePosition, SatelliteRecord, ValidationResult,
} from '@/domain/types';
import { providers } from '@/services/runtime';
import { requestObserverLocation } from '@/services/location';

type TrackerState = {
  selected: SatelliteRecord | null;
  position: SatellitePosition | null;
  observer: Observer | null;
  look: LookAngles | null;
  passes: PassWindow[];
  catalog: CatalogItem[];
  category: SatelliteCategory;
  groundTrack: GeoPoint[][];
  footprint: GeoPoint[][];
  constellation: { noradId: number; name: string; position: SatellitePosition }[];
  constellationRecords: SatelliteRecord[];
  minElevationDeg: number;
  notificationLeadMinutes: number;
  loading: boolean;
  error: string | null;
  validation: ValidationResult | null;
  loadInitial(): Promise<void>;
  selectSatellite(noradId: number): Promise<void>;
  tick(at?: Date): void;
  locateObserver(): Promise<void>;
  setManualObserver(latitude: number, longitude: number, altitudeMeters: number): void;
  loadCatalog(category: SatelliteCategory, force?: boolean): Promise<void>;
  calculatePasses(): void;
  validate(preferred?: string): Promise<void>;
  loadConstellation(limit?: number): Promise<void>;
  setMinElevation(value: number): void;
  setNotificationLead(value: number): void;
  clearError(): void;
};

export const useTrackerStore = create<TrackerState>((set, get) => ({
  selected: null, position: null, observer: null, look: null, passes: [], catalog: [],
  category: 'stations', groundTrack: [], footprint: [], constellation: [], constellationRecords: [],
  minElevationDeg: 10, notificationLeadMinutes: 10, loading: false, error: null, validation: null,

  async loadInitial() {
    if (get().selected || get().loading) return;
    await get().selectSatellite(25544);
  },
  async selectSatellite(noradId) {
    set({ loading: true, error: null, validation: null, passes: [] });
    try {
      const element = await providers.orbitalData(noradId);
      const selected = createSatelliteRecord(element);
      const now = new Date();
      const position = propagateSatellite(selected, now);
      const observer = get().observer;
      set({
        selected, position,
        look: observer ? calculateLookAngles(selected, observer, now) : null,
        groundTrack: groundTrack(selected, now),
        footprint: footprint(position, position.altitudeKm ?? 0, get().minElevationDeg),
        loading: false,
      });
      if (observer) get().calculatePasses();
    } catch (error) {
      set({ loading: false, error: message(error) });
    }
  },
  tick(at = new Date()) {
    const { selected, position: previousPosition, observer, minElevationDeg, constellationRecords } = get();
    if (!selected) return;
    try {
      const position = propagateSatellite(selected, at);
      set({
        position,
        look: observer ? calculateLookAngles(selected, observer, at) : null,
        groundTrack: !previousPosition || at.getTime() - previousPosition.timestamp.getTime() >= 60_000
          ? groundTrack(selected, at)
          : get().groundTrack,
        footprint: footprint(position, position.altitudeKm ?? 0, minElevationDeg),
        constellation: constellationRecords.map((record) => ({
          noradId: record.noradId, name: record.name, position: propagateSatellite(record, at),
        })),
      });
    } catch (error) { set({ error: message(error) }); }
  },
  async locateObserver() {
    set({ loading: true, error: null });
    try {
      const observer = await requestObserverLocation();
      set({ observer, loading: false });
      get().tick();
      get().calculatePasses();
    } catch (error) { set({ loading: false, error: message(error) }); }
  },
  setManualObserver(latitude, longitude, altitudeMeters) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      set({ error: 'Latitud o longitud manual fuera de rango.' });
      return;
    }
    set({ observer: { latitude, longitude, altitudeMeters, source: 'manual', measuredAt: new Date() }, error: null });
    get().tick();
    get().calculatePasses();
  },
  async loadCatalog(category, force = false) {
    set({ loading: true, error: null, category });
    try { set({ catalog: await providers.catalog(category, force), loading: false }); }
    catch (error) { set({ loading: false, error: message(error) }); }
  },
  calculatePasses() {
    const { selected, observer, minElevationDeg } = get();
    if (!selected || !observer) { set({ passes: [] }); return; }
    try {
      set({ passes: predictPasses(selected, observer, { start: new Date(), horizonHours: 72, minElevationDeg }) });
    } catch (error) { set({ error: message(error) }); }
  },
  async validate(preferred) {
    const selected = get().selected;
    if (!selected) return;
    set({ loading: true, error: null });
    try {
      const remote = await providers.validation(selected.noradId, preferred);
      const local = propagateSatellite(selected, remote.timestamp);
      set({ validation: comparePositions(local, remote, selected), loading: false });
    } catch (error) { set({ loading: false, error: message(error) }); }
  },
  async loadConstellation(limit = 40) {
    set({ loading: true, error: null });
    try {
      const records = (await providers.orbitalBatch('starlink', limit)).map(createSatelliteRecord);
      const at = new Date();
      set({
        constellationRecords: records,
        constellation: records.map((record) => ({ noradId: record.noradId, name: record.name, position: propagateSatellite(record, at) })),
        loading: false,
      });
    } catch (error) { set({ loading: false, error: message(error) }); }
  },
  setMinElevation(value) {
    set({ minElevationDeg: Math.max(0, Math.min(45, value)) });
    get().tick();
    get().calculatePasses();
  },
  setNotificationLead(value) { set({ notificationLeadMinutes: Math.max(1, Math.min(120, value)) }); },
  clearError() { set({ error: null }); },
}));

function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
