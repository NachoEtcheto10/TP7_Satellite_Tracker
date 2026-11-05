import { SqliteCacheStore } from '@/data/cache';
import {
  CelesTrakProvider,
  N2yoProvider,
  ProviderOrchestrator,
  SpaceTrackProvider,
  WhereTheIssProvider,
} from '@/data/providers';

const cache = new SqliteCacheStore();
const proxy = process.env.EXPO_PUBLIC_API_PROXY_URL;

export const providers = new ProviderOrchestrator([
  new CelesTrakProvider(cache),
  new SpaceTrackProvider(proxy),
  new N2yoProvider(proxy),
  new WhereTheIssProvider(),
]);
