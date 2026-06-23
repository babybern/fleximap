export default function ControlPointPanel({ points, pending, onDelete, onClear }) {
  return (
    <div className="panel">
      <h3>Points de contrôle ({points.length})</h3>
      {pending && (
        <div className="pending-hint">
          {pending === 'img'
            ? '→ Clique sur ta carte image (cadre à gauche)'
            : '→ Clique sur la carte OSM pour placer le point GPS'}
        </div>
      )}
      {points.length === 0 && !pending && (
        <p className="hint">Appuie sur "Ajouter point" pour commencer le calage.</p>
      )}
      <ul>
        {points.map((cp, i) => (
          <li key={i}>
            <span>CP {i + 1} — img ({Math.round(cp.img[0])}, {Math.round(cp.img[1])}) / GPS ({cp.gps[0].toFixed(4)}, {cp.gps[1].toFixed(4)})</span>
            <button className="btn-sm danger" onClick={() => onDelete(i)}>✕</button>
          </li>
        ))}
      </ul>
      {points.length > 0 && (
        <button className="btn-sm" onClick={onClear}>Tout effacer</button>
      )}
    </div>
  );
}
