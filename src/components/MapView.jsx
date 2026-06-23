import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corner handle icon
const handleIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#3b82f6;border:2px solid #fff;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:move"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Edge handle icon (thinner)
const edgeIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;background:#60a5fa;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:move"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

export default function MapView({
  imageUrl,
  imageBounds,
  onImageBoundsChange,
  opacity,
  mode,
  controlPoints,
  onMapClick,
  queryResult,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const markerRef = useRef(null);
  const handleMarkersRef = useRef([]);

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current).setView([46.5, 2.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // Overlay: update when image or bounds change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !imageUrl || !imageBounds) return;
    if (overlayRef.current) overlayRef.current.remove();
    const overlay = L.imageOverlay(imageUrl, imageBounds, { opacity, interactive: false });
    overlay.addTo(map);
    overlayRef.current = overlay;
  }, [imageUrl, imageBounds]);

  // Opacity only
  useEffect(() => {
    overlayRef.current?.setOpacity(opacity);
  }, [opacity]);

  // Corner + edge handles for repositioning overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old handles
    handleMarkersRef.current.forEach(m => m.remove());
    handleMarkersRef.current = [];

    if (!imageUrl || !imageBounds || !onImageBoundsChange) return;

    // bounds: [[south, west], [north, east]]
    let [s, w, n, e] = [imageBounds[0][0], imageBounds[0][1], imageBounds[1][0], imageBounds[1][1]];

    // We create 8 handles: 4 corners + 4 edge midpoints
    // Each handle knows which bounds edges it can move
    const handles = [
      // corners
      { pos: () => [s, w], update: (lat, lng) => { s = lat; w = lng; }, icon: handleIcon },
      { pos: () => [n, w], update: (lat, lng) => { n = lat; w = lng; }, icon: handleIcon },
      { pos: () => [n, e], update: (lat, lng) => { n = lat; e = lng; }, icon: handleIcon },
      { pos: () => [s, e], update: (lat, lng) => { s = lat; e = lng; }, icon: handleIcon },
      // edges
      { pos: () => [(s + n) / 2, w], update: (_, lng) => { w = lng; }, icon: edgeIcon },
      { pos: () => [n, (w + e) / 2], update: (lat) => { n = lat; }, icon: edgeIcon },
      { pos: () => [(s + n) / 2, e], update: (_, lng) => { e = lng; }, icon: edgeIcon },
      { pos: () => [s, (w + e) / 2], update: (lat) => { s = lat; }, icon: edgeIcon },
    ];

    const markers = handles.map(({ pos, update, icon }) => {
      const m = L.marker(pos(), { icon, draggable: true, zIndexOffset: 1000 }).addTo(map);
      m.on('drag', (ev) => {
        const { lat, lng } = ev.latlng;
        update(lat, lng);
        // Refresh all marker positions
        markers.forEach((mk, i) => mk.setLatLng(handles[i].pos()));
        // Update overlay live
        if (overlayRef.current) overlayRef.current.setBounds([[s, w], [n, e]]);
      });
      m.on('dragend', () => {
        onImageBoundsChange([[s, w], [n, e]]);
      });
      return m;
    });

    handleMarkersRef.current = markers;
  }, [imageUrl, imageBounds, onImageBoundsChange]);

  // Show/hide handles depending on mode
  useEffect(() => {
    const show = mode === 'calibrate';
    handleMarkersRef.current.forEach(m => {
      const el = m.getElement();
      if (el) el.style.display = show ? '' : 'none';
    });
  }, [mode]);

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
