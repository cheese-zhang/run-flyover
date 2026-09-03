import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

type Activity = { id: string; activityName?: string | null; startedAt: string; distanceMeters?: number | null; durationSeconds?: number | null };
type Route = { type: 'Feature'; geometry: { type: 'LineString'; coordinates: number[][] } };

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function formatDistance(m?: number | null) { return m == null ? '-' : `${(m / 1000).toFixed(2)} km`; }
function formatDuration(s?: number | null) { if (s == null) return '-'; return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

export function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [selected, setSelected] = useState<Activity | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch(`${API}/api/v1/activities`).then((r) => r.json()).then(setActivities).catch(console.error); }, []);
  useEffect(() => {
    if (!selected || !mapRef.current) return;
    fetch(`${API}/api/v1/activities/${selected.id}/route`).then((r) => r.json()).then(setRoute).catch(console.error);
  }, [selected]);
  useEffect(() => {
    if (!mapRef.current) return;
    const map = new maplibregl.Map({ container: mapRef.current, style: 'https://demotiles.maplibre.org/style.json', center: [121.47, 31.23], zoom: 10 });
    map.on('load', () => {
      if (!route) return;
      map.addSource('route', { type: 'geojson', data: route as any });
      map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#e33', 'line-width': 4 } });
      const coords = route.geometry.coordinates;
      if (coords.length) {
        const bounds = coords.reduce((b, c) => b.extend(c as [number, number]), new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]));
        map.fitBounds(bounds, { padding: 50 });
      }
    });
    return () => map.remove();
  }, [route]);

  return <main>
    <header><h1>Run Flyover</h1><p>Running activity visualization</p></header>
    <section className="layout">
      <aside><h2>Activities</h2>{activities.map((a) => <button className={selected?.id === a.id ? 'activity selected' : 'activity'} key={a.id} onClick={() => setSelected(a)}><strong>{a.activityName || 'Run'}</strong><span>{new Date(a.startedAt).toLocaleString()}</span><span>{formatDistance(a.distanceMeters)} · {formatDuration(a.durationSeconds)}</span></button>)}</aside>
      <section className="map"><div ref={mapRef} /></section>
    </section>
  </main>;
}
