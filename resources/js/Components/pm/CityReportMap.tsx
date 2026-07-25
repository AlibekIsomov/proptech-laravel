import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

const pinIcon = L.divIcon({
  className: 'city-report-pin',
  html: '<div style="font-size:26px;line-height:26px">📍</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

/** Read-only OpenStreetMap xaritasi — bitta yoki bir nechta murojaat nuqtasini ko'rsatadi. */
export default function CityReportMap({ points, height = 320 }: { points: MapPoint[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (points.length === 0) {
      map.setView([41.311, 69.279], 11); // Toshkent markazi — fallback
      return;
    }

    const markers = points.map((p) => {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon }).addTo(map);
      if (p.label) m.bindPopup(p.label);
      return m;
    });

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16);
    } else {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
    }
  }, [points]);

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }} />;
}
