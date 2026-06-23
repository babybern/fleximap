import L from 'leaflet';

// Rotate a lat/lng point around a center by angleDeg (clockwise, matches CSS)
export function rotateLatLng(lat, lng, cLat, cLng, angleDeg) {
  const cosLat = Math.cos(cLat * Math.PI / 180);
  const dx = (lng - cLng) * 111000 * cosLat; // meters east
  const dy = (lat - cLat) * 111000;           // meters north
  const rad = angleDeg * Math.PI / 180;
  const dx2 = dx * Math.cos(rad) + dy * Math.sin(rad);
  const dy2 = -dx * Math.sin(rad) + dy * Math.cos(rad);
  return [cLat + dy2 / 111000, cLng + dx2 / (111000 * cosLat)];
}

// Angle in degrees from center to a lat/lng point (0 = north, clockwise)
export function angleTo(lat, lng, cLat, cLng) {
  const cosLat = Math.cos(cLat * Math.PI / 180);
  const dx = (lng - cLng) * 111000 * cosLat;
  const dy = (lat - cLat) * 111000;
  return Math.atan2(dx, dy) * 180 / Math.PI;
}

const RotatableOverlay = L.Layer.extend({
  initialize(url, options) {
    this._url = url;
    L.setOptions(this, { center: [0, 0], widthDeg: 10, heightDeg: 7, rotation: 0, opacity: 0.6 });
    L.setOptions(this, options);
  },

  onAdd(map) {
    this._map = map;
    const pane = map.getPanes().overlayPane;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;pointer-events:none;transform-origin:center center;';
    const img = document.createElement('img');
    img.src = this._url;
    img.style.cssText = 'width:100%;height:100%;display:block;';
    el.appendChild(img);
    pane.appendChild(el);
    this._el = el;
    map.on('zoom move zoomend moveend', this._update, this);
    this._update();
  },

  onRemove(map) {
    this._el.remove();
    map.off('zoom move zoomend moveend', this._update, this);
  },

  _update() {
    const map = this._map;
    if (!map || !this._el) return;
    const { center, widthDeg, heightDeg, rotation, opacity } = this.options;
    const [cLat, cLng] = center;

    const cPx = map.latLngToLayerPoint([cLat, cLng]);
    const ePx = map.latLngToLayerPoint([cLat, cLng + widthDeg / 2]);
    const nPx = map.latLngToLayerPoint([cLat + heightDeg / 2, cLng]);

    const halfW = Math.abs(ePx.x - cPx.x);
    const halfH = Math.abs(nPx.y - cPx.y);

    this._el.style.left = (cPx.x - halfW) + 'px';
    this._el.style.top = (cPx.y - halfH) + 'px';
    this._el.style.width = (halfW * 2) + 'px';
    this._el.style.height = (halfH * 2) + 'px';
    this._el.style.opacity = opacity;
    this._el.style.transform = `rotate(${rotation}deg)`;
  },

  setConfig(opts) {
    L.setOptions(this, opts);
    this._update();
  },
});

export default RotatableOverlay;
