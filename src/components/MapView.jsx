import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { computeOverlayTransform } from '../hooks/useAffineTransform';

const MapView = forwardRef(function MapView({
  imageUrl,
  imageNatW,
  imageNatH,
  opacity,
  mode,
  controlPoints,
  onMapClick,
  queryResult,
}, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const imgElRef = useRef(null);
  const queryMarkerRef = useRef(null);
  const stateRef = useRef({ controlPoints, opacity, imageUrl, imageNatW, imageNatH });

  useImperativeHandle(ref, () => ({
    getCenter: () => {
      const c = mapRef.current?.getCenter();
      return c ? [c.lat, c.lng] : [46.5, 2.5];
    },
  }));

  // Keep stateRef current
  stateRef.current = { controlPoints, opacity, imageUrl, imageNatW, imageNatH };

  function applyTransform() {
    const map = mapRef.current;
    const img = imgElRef.current;
    if (!map || !img) return;
    const { controlPoints, opacity } = stateRef.current;

    img.style.opacity = opacity;

    if (controlPoints.length < 2) {
      img.style.display = 'none';
      return;
    }

    const t = computeOverlayTransform(controlPoints, map);
    if (!t) { img.style.display = 'none'; return; }

    img.style.display = 'block';
    img.style.transform = `matrix(${t.a},${t.b},${t.c},${t.d},${t.tx},${t.ty})`;
  }

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current).setView([46.5, 2.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    map.on('move zoom viewreset zoomend moveend', applyTransform);
    mapRef.current = map;
  }, []);

  // Create/recreate image element when imageUrl changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (imgElRef.current) imgElRef.current.remove();

    if (!imageUrl) { imgElRef.current = null; return; }

    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `position:absolute;left:0;top:0;width:${imageNatW}px;height:${imageNatH}px;transform-origin:0 0;pointer-events:none;display:none;`;
    map.getPanes().overlayPane.appendChild(img);
    imgElRef.current = img;
    applyTransform();
  }, [imageUrl]);

  // Re-apply when control points or opacity change
  useEffect(() => { applyTransform(); }, [controlPoints, opacity]);

  // Map click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = e => onMapClick?.(e.latlng);
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
    queryMarkerRef.current?.remove();
    if (queryResult) {
      queryMarkerRef.current = L.marker([queryResult[0], queryResult[1]])
        .addTo(map)
        .bindPopup(`${queryResult[0].toFixed(5)}, ${queryResult[1].toFixed(5)}`)
        .openPopup();
    }
  }, [queryResult]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});

export default MapView;
