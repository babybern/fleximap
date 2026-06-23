// Compute CSS matrix(a,b,c,d,tx,ty) that maps image pixels to Leaflet layer pixels
// given control point pairs { img: [x,y], gps: [lat,lng] }

function solve3(A, b) {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let max = col;
    for (let row = col + 1; row < 3; row++) if (Math.abs(M[row][col]) > Math.abs(M[max][col])) max = row;
    [M[col], M[max]] = [M[max], M[col]];
    if (Math.abs(M[col][col]) < 1e-10) return null;
    for (let row = col + 1; row < 3; row++) {
      const f = M[row][col] / M[col][col];
      for (let j = col; j <= 3; j++) M[row][j] -= f * M[col][j];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = M[i][3] / M[i][i];
    for (let j = i - 1; j >= 0; j--) M[j][3] -= M[j][i] * x[i];
  }
  return x;
}

function similarity(p1, p2) {
  const dxi = p2.ix - p1.ix, dyi = p2.iy - p1.iy;
  const dxs = p2.sx - p1.sx, dys = p2.sy - p1.sy;
  const lenI = Math.sqrt(dxi * dxi + dyi * dyi);
  if (lenI < 0.001) return null;
  const scale = Math.sqrt(dxs * dxs + dys * dys) / lenI;
  const rot = Math.atan2(dys, dxs) - Math.atan2(dyi, dxi);
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const a = scale * cos, b = scale * sin, c = -scale * sin, d = scale * cos;
  return { a, b, c, d, tx: p1.sx - a * p1.ix - c * p1.iy, ty: p1.sy - b * p1.ix - d * p1.iy };
}

function affine(pts) {
  const AtA = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const AtBx = [0, 0, 0], AtBy = [0, 0, 0];
  for (const p of pts) {
    const r = [p.ix, p.iy, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) AtA[i][j] += r[i] * r[j];
      AtBx[i] += r[i] * p.sx;
      AtBy[i] += r[i] * p.sy;
    }
  }
  const wx = solve3(AtA, AtBx);
  const wy = solve3(AtA, AtBy);
  if (!wx || !wy) return null;
  return { a: wx[0], c: wx[1], tx: wx[2], b: wy[0], d: wy[1], ty: wy[2] };
}

export function computeOverlayTransform(controlPoints, map) {
  if (controlPoints.length < 2 || !map) return null;
  const pts = controlPoints.map(cp => {
    const sp = map.latLngToLayerPoint([cp.gps[0], cp.gps[1]]);
    return { ix: cp.img[0], iy: cp.img[1], sx: sp.x, sy: sp.y };
  });
  return pts.length === 2 ? similarity(pts[0], pts[1]) : affine(pts);
}
