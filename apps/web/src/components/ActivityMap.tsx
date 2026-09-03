import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export type RouteGeoJSON = {
  type: 'Feature';
  properties: { activityId: string };
  geometry: { type: 'LineString'; coordinates: number[][] };
};

interface ActivityMapProps {
  route: RouteGeoJSON | null;
}

export function ActivityMap({ route }: ActivityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [121.47, 31.23],
      zoom: 10,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;
    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;
    const render = () => {
      const coordinates = route.geometry.coordinates;
      if (!coordinates.length) return;
      const source = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(route as GeoJSON.Feature<GeoJSON.LineString>);
      else {
        map.addSource('route', { type: 'geojson', data: route as GeoJSON.Feature<GeoJSON.LineString> });
        map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#ff5c35', 'line-width': 4 } });
      }

      const bounds = coordinates.reduce(
        (result, coordinate) => result.extend([coordinate[0], coordinate[1]]),
        new maplibregl.LngLatBounds([coordinates[0][0], coordinates[0][1]], [coordinates[0][0], coordinates[0][1]]),
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 16 });

      document.querySelectorAll('.run-marker').forEach((element) => element.remove());
      new maplibregl.Marker({ color: '#2ecc71', className: 'run-marker' }).setLngLat([coordinates[0][0], coordinates[0][1]]).addTo(map);
      const end = coordinates[coordinates.length - 1];
      new maplibregl.Marker({ color: '#e74c3c', className: 'run-marker' }).setLngLat([end[0], end[1]]).addTo(map);
    };

    if (map.loaded()) render();
    else map.once('load', render);
  }, [route]);

  return <div ref={containerRef} className="activity-map" />;
}
