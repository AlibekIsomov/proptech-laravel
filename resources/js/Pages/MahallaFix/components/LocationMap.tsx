import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../types';

/**
 * Interaktiv OpenStreetMap xaritasi (Leaflet). Draggable marker orqali foydalanuvchi
 * aniqlangan GPS nuqtasini qo'lda to'g'rilashi mumkin. Standart Leaflet ikona o'rniga
 * emoji divIcon ishlatiladi (bundler bilan ikona-yo'l muammosini oldini olish uchun).
 */
const pinIcon = L.divIcon({
  className: 'mahalla-fix-pin',
  html: '<div style="font-size:28px;line-height:28px">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface Props {
  value: LatLng;
  onChange: (pos: LatLng) => void;
  height?: number;
}

export default function LocationMap({ value, onChange, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Xaritani bir marta yaratish
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [value.lat, value.lng],
      zoom: 17,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([value.lat, value.lng], { icon: pinIcon, draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      onChangeRef.current({ lat, lng });
    });

    // Xaritaga bosilganda markerni ko'chirish
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Container o'lchamini to'g'rilash (Telegram WebApp'da kechikish bo'lishi mumkin)
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tashqi value o'zgarsa (masalan GPS qayta aniqlansa) — markerni ko'chirish
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
      mapRef.current.setView([value.lat, value.lng]);
    }
  }, [value.lat, value.lng]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}
    />
  );
}
