import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ActivityMap, type RouteGeoJSON } from './components/ActivityMap';

type Activity = {
  id: string;
  activityName?: string | null;
  startedAt: string;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  avgSpeedMps?: number | null;
  avgHeartRate?: number | null;
  elevationGainMeters?: number | null;
};

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function formatDistance(meters?: number | null) { return meters == null ? '-' : `${(meters / 1000).toFixed(2)} km`; }
function formatDuration(seconds?: number | null) {
  if (seconds == null) return '-';
  return `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function formatPace(speed?: number | null) {
  if (!speed || speed <= 0) return '-';
  const total = Math.round(1000 / speed);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /km`;
}

export function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [route, setRoute] = useState<RouteGeoJSON | null>(null);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    const response = await fetch(`${API}/api/v1/activities?page=1&pageSize=50`);
    if (!response.ok) throw new Error('Failed to load activities');
    const data = await response.json() as Activity[];
    setActivities(data);
    if (!selected && data[0]) setSelected(data[0]);
  }, [selected]);

  useEffect(() => { loadActivities().catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load activities')); }, [loadActivities]);

  useEffect(() => {
    if (!selected) { setRoute(null); return; }
    fetch(`${API}/api/v1/activities/${selected.id}/route`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load route');
        return response.json() as Promise<RouteGeoJSON>;
      })
      .then(setRoute)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load route'));
  }, [selected]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`${API}/api/v1/activities/import`, { method: 'POST', body: form });
      const body = await response.json() as { error?: { message?: string }; id?: string };
      if (!response.ok) throw new Error(body.error?.message ?? 'FIT import failed');
      await loadActivities();
      if (body.id) {
        const imported = await fetch(`${API}/api/v1/activities/${body.id}`).then((result) => result.json()) as Activity;
        setSelected(imported);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'FIT import failed');
    } finally {
      setUploading(false);
    }
  };

  return <main>
    <header className="app-header">
      <div><h1>Run Flyover</h1><p>Running activity visualization</p></div>
      <label className="upload-button">
        {uploading ? 'Importing…' : 'Import FIT'}
        <input type="file" accept=".fit,application/octet-stream" disabled={uploading} onChange={upload} hidden />
      </label>
    </header>
    {error && <div className="error-banner">{error}</div>}
    <section className="layout">
      <aside>
        <h2>Activities</h2>
        {!activities.length && <p className="empty">Import a Garmin .FIT file to start.</p>}
        {activities.map((activity) => <button className={selected?.id === activity.id ? 'activity selected' : 'activity'} key={activity.id} onClick={() => setSelected(activity)}>
          <strong>{activity.activityName || 'Run'}</strong>
          <span>{new Date(activity.startedAt).toLocaleString()}</span>
          <span>{formatDistance(activity.distanceMeters)} · {formatDuration(activity.durationSeconds)}</span>
        </button>)}
      </aside>
      <section className="map-panel">
        <div className="map-summary">
          {selected ? <><strong>{selected.activityName || 'Run'}</strong><span>{formatDistance(selected.distanceMeters)}</span><span>{formatDuration(selected.durationSeconds)}</span><span>{formatPace(selected.avgSpeedMps)}</span><span>{selected.avgHeartRate ? `${Math.round(selected.avgHeartRate)} bpm` : '-'}</span><span>{selected.elevationGainMeters == null ? '-' : `${Math.round(selected.elevationGainMeters)} m ↑`}</span></> : <span>Select an activity</span>}
        </div>
        <ActivityMap route={route} />
      </section>
    </section>
  </main>;
}
