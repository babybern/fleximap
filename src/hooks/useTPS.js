// Thin Plate Spline transformation
// Given control point pairs (image px <-> GPS), interpolates any image point to GPS coords

function rbf(r) {
  return r === 0 ? 0 : r * r * Math.log(r);
}

function distance(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

// Solve Ax = b using Gaussian elimination
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i];
    for (let j = i - 1; j >= 0; j--) M[j][n] -= M[j][i] * x[i];
  }
  return x;
}

export function buildTPS(controlPoints) {
  // controlPoints: [{ img: [x, y], gps: [lat, lng] }, ...]
  if (controlPoints.length < 3) return null;
  const n = controlPoints.length;
  const imgPts = controlPoints.map(p => p.img);
  const gpsPts = controlPoints.map(p => p.gps);

  // Build K matrix (n+3 x n+3)
  const size = n + 3;
  const K = Array.from({ length: size }, () => new Array(size).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      K[i][j] = rbf(distance(imgPts[i], imgPts[j]));
    }
    K[i][n] = 1;
    K[i][n + 1] = imgPts[i][0];
    K[i][n + 2] = imgPts[i][1];
    K[n][i] = 1;
    K[n + 1][i] = imgPts[i][0];
    K[n + 2][i] = imgPts[i][1];
  }

  const bLat = [...gpsPts.map(p => p[0]), 0, 0, 0];
  const bLng = [...gpsPts.map(p => p[1]), 0, 0, 0];

  const wLat = solve(K, bLat);
  const wLng = solve(K, bLng);

  return function transform(imgX, imgY) {
    let lat = wLat[n] + wLat[n + 1] * imgX + wLat[n + 2] * imgY;
    let lng = wLng[n] + wLng[n + 1] * imgX + wLng[n + 2] * imgY;
    for (let i = 0; i < n; i++) {
      const r = rbf(distance([imgX, imgY], imgPts[i]));
      lat += wLat[i] * r;
      lng += wLng[i] * r;
    }
    return [lat, lng];
  };
}
