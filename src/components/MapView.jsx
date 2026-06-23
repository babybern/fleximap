import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RotatableOverlay, { rotateLatLng, angleTo } from './RotatableOverlay';

const cornerIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#3b82f6;border:2px solid #fff;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:nwse-resize"></div>',
  iconSize: [14, 14], iconAnchor: [7, 7],
});
const moveIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;background:#10b981;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:move;display:flex;align-items:center;justify-content:center;font-size:11px">✥</div>',
  iconSize: [18, 18], iconAnchor: [9, 9],
});
const rotateIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#f97316;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:crosshair;display:flex;align-items:center;justify-content:center;font-size:11px">↻</div>',
  iconSize: [16, 16], iconAnchor: [8, 8],
});

const MapView = forwardRef(function MapView({
  imageUrl,
  overlayConfig,
  onOverlayConfigChange,
  opacity,
  mode,
  controlPoints,
  onMapClick,
  queryResult,
}, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const queryMarkerRef = useRef(null);
  const handleMarkersRef = useRef([]);

  useImperativeHandle(ref, () => ({
    getCenter: () => {
      const c = mapRef.current?.getCenter();
      return c ? [c.lat, c.lng] : [46.5, 2.5];
    },
  }));

  // Init map
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current).setView([46.5, 2.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // Overlay lifecycle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !imageUrl || !overlayConfig) return;
    if (overlayRef.current) overlayRef.current.remove();
    const ov = new RotatableOverlay(imageUrl, { ...overlayConfig, opacity });
    ov.addTo(map);
    overlayRef.current = ov;
  }, [imageUrl]);

  // Update overlay config + opacity
  useEffect(() => {
    overlayRef.current?.setConfig({ ...overlayConfig, opacity });
  }, [overlayConfig, opacity]);

  // Handles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    handleMarkersRef.current.forEach(m => m.remove());
    handleMarkersRef.current = [];

    if (!imageUrl || !overlayConfig || !onOverlayConfigChange || mode !== 'calibrate') return;

    let cfg = { ...overlayConfig };

    function commit(newCfg) {
      cfg = { ...cfg, ...newCfg };
      overlayRef.current?.setConfig({ ...cfg, opacity });
      onOverlayConfigChange(cfg);
      refresh();
    }

    function cornerPos(dLat, dLng) {
      return rotateLatLng(
        cfg.center[0] + dLat,
        cfg.center[1] + dLng,
        cfg.center[0], cfg.center[1], cfg.rotation
      );
    }

    const halfH = cfg.heightDeg / 2;
    const halfW = cfg.widthDeg / 2;

    // Rotate handle: above top-center
    const rotHandlePos = () => rotateLatLng(
      cfg.center[0] + cfg.heightDeg / 2 + cfg.heightDeg * 0.2,
      cfg.center[1],
      cfg.center[0], cfg.center[1], cfg.rotation
    );

    const markers = [];

    // Center / move handle
    const moveM = L.marker(cfg.center, { icon: moveIcon, draggable: true, zIndexOffset: 2000 }).addTo(map);
    moveM.on('drag', ev => {
      cfg.center = [ev.latlng.lat, ev.latlng.lng];
      overlayRef.current?.setConfig({ ...cfg, opacity });
      refresh();
    });
    moveM.on('dragend', () => onOverlayConfigChange({ ...cfg }));
    markers.push(moveM);

    // Rotate handle
    const rotM = L.marker(rotHandlePos(), { icon: rotateIcon, draggable: true, zIndexOffset: 2000 }).addTo(map);
    rotM.on('drag', ev => {
      const angle = angleTo(ev.latlng.lat, ev.latlng.lng, cfg.center[0], cfg.center[1]);
      cfg.rotation = ((angle % 360) + 360) % 360;
      overlayRef.current?.setConfig({ ...cfg, opacity });
      refresh();
    });
    rotM.on('dragend', () => onOverlayConfigChange({ ...cfg }));
    markers.push(rotM);

    // 4 corner handles (symmetric resize)
    const corners = [
      [halfH, -halfW], [halfH, halfW], [-halfH, halfW], [-halfH, -halfW]
    ];
    corners.forEach(([dLat, dLng]) => {
      const m = L.marker(cornerPos(dLat, dLng), { icon: cornerIcon, draggable: true, zIndexOffset: 1500 }).addTo(map);
      m.on('drag', ev => {
        // Unrotate drag position to image space
        const cosLat = Math.cos(cfg.center[0] * Math.PI / 180);
        const rad = -cfg.rotation * Math.PI / 180;
        const dx = (ev.latlng.lng - cfg.center[1]) * 111000 * cosLat;
        const dy = (ev.latlng.lat - cfg.center[0]) * 111000;
        const ux = dx * Math.cos(rad) + dy * Math.sin(rad);
        const uy = -dx * Math.sin(rad) + dy * Math.cos(rad);
        cfg.widthDeg = Math.max(0.01, Math.abs(ux) * 2 / (111000 * cosLat));
        cfg.heightDeg = Math.max(0.01, Math.abs(uy) * 2 / 111000);
        overlayRef.current?.setConfig({ ...cfg, opacity });
        refresh();
      });
      m.on('dragend', () => onOverlayConfigChange({ ...cfg }));
      markers.push(m);
    });

    handleMarkersRef.current = markers;

    function refresh() {
      const h = cfg.heightDeg / 2;
      const w = cfg.widthDeg / 2;
      const corners2 = [[h, -w], [h, w], [-h, w], [-h, -w]];
      // corners start at index 2 (after moveM and rotM)
      corners2.forEach((c, i) => markers[i + 2].setLatLng(cornerPos(c[0], c[1])));
      markers[0].setLatLng(cfg.center);
      markers[1].setLatLng(rotHandlePos());
    }
  }, [imageUrl, overlayConfig, onOverlayConfigChange, mode, opacity]);

  // Map click
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

  // Query marker
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
