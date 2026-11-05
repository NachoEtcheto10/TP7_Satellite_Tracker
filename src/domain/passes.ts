import type { Observer, PassWindow, SatelliteRecord } from './types';
import { calculateLookAngles } from './orbital';

type PredictionOptions = {
  start: Date;
  horizonHours?: number;
  minElevationDeg?: number;
  coarseStepSeconds?: number;
  maxPasses?: number;
};

export function predictPasses(record: SatelliteRecord, observer: Observer, options: PredictionOptions): PassWindow[] {
  const horizonHours = options.horizonHours ?? 48;
  const threshold = options.minElevationDeg ?? 10;
  const coarseStepMs = (options.coarseStepSeconds ?? 60) * 1000;
  const maxPasses = options.maxPasses ?? 8;
  const endMs = options.start.getTime() + horizonHours * 3_600_000;
  const elevation = (ms: number) => calculateLookAngles(record, observer, new Date(ms)).elevationDeg;
  const passes: PassWindow[] = [];
  let previousMs = options.start.getTime();
  let previousAbove = elevation(previousMs) >= threshold;
  let aosMs: number | null = previousAbove ? previousMs : null;
  let inProgress = previousAbove;

  for (let currentMs = previousMs + coarseStepMs; currentMs <= endMs && passes.length < maxPasses; currentMs += coarseStepMs) {
    const currentAbove = elevation(currentMs) >= threshold;
    if (!previousAbove && currentAbove) {
      aosMs = refineCrossing(elevation, previousMs, currentMs, threshold, true);
      inProgress = false;
    }
    if (previousAbove && !currentAbove && aosMs !== null) {
      const losMs = refineCrossing(elevation, previousMs, currentMs, threshold, false);
      passes.push(buildPass(record, observer, aosMs, losMs, inProgress));
      aosMs = null;
      inProgress = false;
    }
    previousAbove = currentAbove;
    previousMs = currentMs;
  }
  return passes;
}

function refineCrossing(elevation: (ms: number) => number, lowInitial: number, highInitial: number, threshold: number, rising: boolean): number {
  let low = lowInitial;
  let high = highInitial;
  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);
    const above = elevation(middle) >= threshold;
    if (above === rising) high = middle;
    else low = middle;
  }
  return rising ? high : low;
}

function buildPass(record: SatelliteRecord, observer: Observer, aosMs: number, losMs: number, inProgress: boolean): PassWindow {
  let left = aosMs;
  let right = losMs;
  for (let iteration = 0; iteration < 32 && right - left > 1000; iteration += 1) {
    const third = (right - left) / 3;
    const m1 = left + third;
    const m2 = right - third;
    if (calculateLookAngles(record, observer, new Date(m1)).elevationDeg < calculateLookAngles(record, observer, new Date(m2)).elevationDeg) left = m1;
    else right = m2;
  }
  const maxMs = Math.round((left + right) / 2);
  const sampleStep = Math.max(5000, Math.floor((losMs - aosMs) / 72));
  const samples: PassWindow['samples'] = [];
  for (let ms = aosMs; ms < losMs; ms += sampleStep) {
    const look = calculateLookAngles(record, observer, new Date(ms));
    samples.push({ at: new Date(ms), azimuthDeg: look.azimuthDeg, elevationDeg: look.elevationDeg });
  }
  const finalLook = calculateLookAngles(record, observer, new Date(losMs));
  samples.push({ at: new Date(losMs), azimuthDeg: finalLook.azimuthDeg, elevationDeg: finalLook.elevationDeg });
  return {
    aos: new Date(aosMs), maxElevationAt: new Date(maxMs), los: new Date(losMs),
    maxElevationDeg: calculateLookAngles(record, observer, new Date(maxMs)).elevationDeg,
    inProgress, samples,
  };
}
