import * as Location from 'expo-location';
import type { Observer } from '@/domain/types';

export async function requestObserverLocation(): Promise<Observer> {
  const services = await Location.hasServicesEnabledAsync();
  if (!services) throw new Error('Los servicios de ubicación están desactivados en Android.');
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Sin permiso de ubicación. Podés cargar un observador manual en Ajustes.');
  const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: result.coords.latitude,
    longitude: result.coords.longitude,
    altitudeMeters: result.coords.altitude ?? 0,
    source: 'gps',
    measuredAt: new Date(result.timestamp),
  };
}
