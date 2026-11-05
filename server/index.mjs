import http from 'node:http';

const port = Number(process.env.PORT ?? 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? '*';
const buckets = new Map();
let spaceTrackCookie = null;
const requestTimeoutMs = 12_000;

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
  });
  response.end(JSON.stringify(body));
}

function allow(ip) {
  const now = Date.now();
  const recent = (buckets.get(ip) ?? []).filter((at) => now - at < 60_000);
  if (recent.length >= 60) return false;
  recent.push(now); buckets.set(ip, recent); return true;
}

async function n2yoPosition(noradId) {
  const key = process.env.N2YO_API_KEY;
  if (!key) throw Object.assign(new Error('N2YO_API_KEY no configurada.'), { status: 503 });
  const url = `https://api.n2yo.com/rest/v1/satellite/positions/${noradId}/0/0/0/1/&apiKey=${encodeURIComponent(key)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });
  if (!response.ok) throw Object.assign(new Error(`N2YO respondió HTTP ${response.status}.`), { status: 502 });
  const data = await response.json();
  if (!data.positions?.[0]) throw Object.assign(new Error('N2YO no devolvió posición.'), { status: 502 });
  return data.positions[0];
}

async function spaceTrackLogin() {
  const identity = process.env.SPACETRACK_IDENTITY;
  const password = process.env.SPACETRACK_PASSWORD;
  if (!identity || !password) throw Object.assign(new Error('Credenciales de Space-Track no configuradas.'), { status: 503 });
  const response = await fetch('https://www.space-track.org/ajaxauth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ identity, password }),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (!response.ok) throw Object.assign(new Error('Space-Track rechazó el inicio de sesión.'), { status: 502 });
  spaceTrackCookie = response.headers.get('set-cookie')?.split(';', 1)[0] ?? null;
  if (!spaceTrackCookie) throw Object.assign(new Error('Space-Track no devolvió una cookie de sesión.'), { status: 502 });
}

async function spaceTrack(path) {
  if (!spaceTrackCookie) await spaceTrackLogin();
  let response = await fetch(`https://www.space-track.org${path}`, { headers: { Cookie: spaceTrackCookie }, signal: AbortSignal.timeout(requestTimeoutMs) });
  if (response.status === 401) { spaceTrackCookie = null; await spaceTrackLogin(); response = await fetch(`https://www.space-track.org${path}`, { headers: { Cookie: spaceTrackCookie }, signal: AbortSignal.timeout(requestTimeoutMs) }); }
  if (!response.ok) throw Object.assign(new Error(`Space-Track respondió HTTP ${response.status}.`), { status: 502 });
  return response.json();
}

const groupPredicate = {
  stations: 'OBJECT_NAME/~~ISS', starlink: 'OBJECT_NAME/~~STARLINK', gps: 'OBJECT_NAME/~~GPS',
  weather: 'OBJECT_NAME/~~NOAA', active: 'DECAY_DATE/null-val',
};

const server = http.createServer(async (request, response) => {
  if (!allow(request.socket.remoteAddress ?? 'unknown')) return json(response, 429, { error: 'Límite local: 60 solicitudes/minuto.' });
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  try {
    let match = url.pathname.match(/^\/api\/n2yo\/position\/(\d{1,9})$/);
    if (match) return json(response, 200, await n2yoPosition(Number(match[1])));
    match = url.pathname.match(/^\/api\/spacetrack\/orbital\/(\d{1,9})$/);
    if (match) {
      const rows = await spaceTrack(`/basicspacedata/query/class/gp/NORAD_CAT_ID/${match[1]}/orderby/EPOCH%20desc/limit/1/format/json`);
      if (!rows[0]) return json(response, 404, { error: 'Objeto no encontrado.' });
      return json(response, 200, rows[0]);
    }
    if (url.pathname === '/api/spacetrack/catalog') {
      const group = url.searchParams.get('group');
      const predicate = groupPredicate[group];
      if (!predicate) return json(response, 400, { error: 'Grupo inválido.' });
      const rows = await spaceTrack(`/basicspacedata/query/class/gp/${predicate}/orderby/EPOCH%20desc/limit/5000/format/json`);
      return json(response, 200, rows);
    }
    if (url.pathname === '/health') return json(response, 200, { ok: true, n2yo: Boolean(process.env.N2YO_API_KEY), spaceTrack: Boolean(process.env.SPACETRACK_IDENTITY && process.env.SPACETRACK_PASSWORD) });
    return json(response, 404, { error: 'Ruta inexistente.' });
  } catch (error) {
    console.error(error);
    return json(response, Number(error.status ?? 500), { error: error instanceof Error ? error.message : 'Error interno.' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Orbita proxy escuchando en http://0.0.0.0:${port}`));
