import { useState, useCallback } from 'react';
import MapView from './components/MapView';
import ImageCanvas from './components/ImageCanvas';
import ImagePicker from './components/ImagePicker';
import ControlPointPanel from './components/ControlPointPanel';
import { buildTPS } from './hooks/useTPS';
import './App.css';

const DEFAULT_BOUNDS = [[41, -5], [51, 10]];

export default function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageSize, setImageSize] = useState({ w: 1, h: 1 });
  const [opacity, setOpacity] = useState(0.6);
  const [imageBounds, setImageBounds] = useState(DEFAULT_BOUNDS);
  const [controlPoints, setControlPoints] = useState([]);
  const [pendingImg, setPendingImg] = useState(null);
  const [addingPoint, setAddingPoint] = useState(false);
  const [waitingGPS, setWaitingGPS] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [mode, setMode] = useState('calibrate');

  const tps = controlPoints.length >= 3 ? buildTPS(controlPoints) : null;

  function handleImage(url, w, h) {
    setImageUrl(url);
    setImageSize({ w, h });
    setControlPoints([]);
    setQueryResult(null);
  }

  function startAddPoint() {
    setAddingPoint(true);
    setWaitingGPS(false);
    setPendingImg(null);
  }

  function handleImageClick(x, y) {
    if (!addingPoint) return;
    setPendingImg([x, y]);
    setAddingPoint(false);
    setWaitingGPS(true);
  }

  const handleMapClick = useCallback((latlng) => {
    if (waitingGPS && pendingImg) {
      setControlPoints(prev => [...prev, { img: pendingImg, gps: [latlng.lat, latlng.lng] }]);
      setPendingImg(null);
      setWaitingGPS(false);
    }
  }, [waitingGPS, pendingImg]);

  function handleQueryImageClick(x, y) {
    if (mode !== 'query' || !tps) return;
    const [lat, lng] = tps(x, y);
    setQueryResult([lat, lng]);
  }

  function deletePoint(i) {
    setControlPoints(prev => prev.filter((_, idx) => idx !== i));
  }

  function saveCalibration() {
    const data = { controlPoints, imageBounds };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'calibration.json';
    a.click();
  }

  function loadCalibration(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setControlPoints(data.controlPoints || []);
      } catch {
        alert('Fichier invalide');
      }
    };
    reader.readAsText(file);
  }

  const pendingStep = addingPoint ? 'img' : waitingGPS ? 'gps' : null;
  const canQuery = tps !== null;

  return (
    <div className="app">
      <header>
        <h1>FlexiMap</h1>
        <div className="toolbar">
          <ImagePicker onImage={handleImage} />
          <label className="opacity-label">
            Opacité
            <input type="range" min="0" max="1" step="0.05" value={opacity}
              onChange={e => setOpacity(Number(e.target.value))} />
          </label>
          <div className="mode-toggle">
            <button className={mode === 'calibrate' ? 'active' : ''} onClick={() => setMode('calibrate')}>Calage</button>
            <button className={mode === 'query' ? 'active' : ''} disabled={!canQuery} onClick={() => setMode('query')}>
              Convertir{!canQuery ? ' (3 pts min)' : ''}
            </button>
          </div>
          <button className="btn" onClick={saveCalibration} disabled={controlPoints.length < 3}>Sauvegarder calage</button>
          <label className="btn">
            Charger calage
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={loadCalibration} />
          </label>
        </div>
      </header>

      <main>
        <section className="image-section">
          <div className="section-title">
            Carte source
            {mode === 'query' && canQuery && <span className="hint-inline"> — clique pour convertir</span>}
          </div>
          <div className="image-wrapper">
            <ImageCanvas
              imageUrl={imageUrl}
              imageWidth={imageSize.w}
              imageHeight={imageSize.h}
              controlPoints={controlPoints}
              pendingImg={pendingImg}
              onImageClick={mode === 'calibrate' ? handleImageClick : handleQueryImageClick}
            />
          </div>
        </section>

        <aside className="sidebar">
          {mode === 'calibrate' && (
            <>
              <button className="btn full" onClick={startAddPoint} disabled={addingPoint || waitingGPS || !imageUrl}>
                + Ajouter un point
              </button>
              <ControlPointPanel
                points={controlPoints}
                pending={pendingStep}
                onDelete={deletePoint}
                onClear={() => setControlPoints([])}
              />
            </>
          )}
          {mode === 'query' && (
            <div className="panel">
              <h3>Résultat</h3>
              {queryResult
                ? <>
                    <p><strong>Latitude :</strong> {queryResult[0].toFixed(6)}</p>
                    <p><strong>Longitude :</strong> {queryResult[1].toFixed(6)}</p>
                    <p className="hint">Marqueur affiché sur la carte.</p>
                  </>
                : <p className="hint">Clique un point sur ta carte source.</p>
              }
            </div>
          )}
        </aside>

        <section className="map-section">
          <div className="section-title">OpenStreetMap</div>
          <MapView
            imageUrl={imageUrl}
            imageBounds={imageBounds}
            onImageBoundsChange={setImageBounds}
            opacity={opacity}
            mode={mode}
            controlPoints={controlPoints}
            onMapClick={handleMapClick}
            queryResult={queryResult}
          />
        </section>
      </main>
    </div>
  );
}
