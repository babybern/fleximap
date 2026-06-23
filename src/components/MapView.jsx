import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView({
  imageUrl,
  imageBounds,
  onImageBoundsChange,
  opacity,
  mode, // 'adjust' | 'calibrate' | 'query'
  controlPoints,
  onMapClick,
  queryResult,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const markerRef = useRef(null);

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current).setView([46.5, 2.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // Update overlay when image or bounds change
  useEffect(() => {
    if (!mapRef.current || !imageUrl || !imageBounds) return;
    if (overlayRef.current) overlayRef.current.remove();
    const overlay = L.imageOverlay(imageUrl, imageBounds, { opacity, interactive: false });
    overlay.addTo(mapRef.current);
    overlayRef.current = overlay;
  }, [imageUrl, imageBounds]);

  // Update opacity
  useEffect(() => {
    overlayRef.current?.setOpacity(opacity);
  }, [opacity]);

  // Map click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e) => onMapClick && onMapClick(e.latlng);
    map.on('click', handler);
    return () => map.off('click', handler);
  }, [onMapClick]);

  // Control point markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Remove old cp markers stored on map
    if (map._cpMarkers) map._cpMarkers.forEach(m => m.remove());
    map._cpMarkers = controlPoints.map((cp, i) => {
      const m = L.circleMarker([cp.gps[0], cp.gps[1]], {
        radius: 7, color: '#f97316', fillColor: '#fff', fillOpacity: 1, weight: 2,
      }).addTo(map);
      m.bindTooltip(`CP ${i + 1}`);
      return m;
    });
  }, [controlPoints]);

  // Query result marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) markerRef.current.remove();
    if (queryResult) {
      markerRef.current = L.marker([queryResult[0], queryResult[1]])
        .addTo(map)
        .bindPopup(`${queryResult[0].toFixed(5)}, ${queryResult[1].toFixed(5)}`)
        .openPopup();
    }
  }, [queryResult]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
