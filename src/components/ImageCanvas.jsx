import { useRef, useEffect } from 'react';

export default function ImageCanvas({ imageUrl, imageWidth, imageHeight, controlPoints, pendingImg, onImageClick }) {
  const canvasRef = useRef();
  const imgRef = useRef();

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => { imgRef.current = img; resizeAndDraw(); };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => { draw(); }, [controlPoints, pendingImg]);

  function resizeAndDraw() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    // Match canvas pixel size to its CSS display size for 1:1 accuracy
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    draw();
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Draw image centered with object-fit: contain
    const imgRatio = imageWidth / imageHeight;
    const canvasRatio = cw / ch;
    let drawW, drawH, offsetX, offsetY;
    if (imgRatio > canvasRatio) {
      drawW = cw; drawH = cw / imgRatio;
      offsetX = 0; offsetY = (ch - drawH) / 2;
    } else {
      drawH = ch; drawW = ch * imgRatio;
      offsetX = (cw - drawW) / 2; offsetY = 0;
    }
    ctx.drawImage(imgRef.current, offsetX, offsetY, drawW, drawH);

    // Scale from image natural coords to canvas draw area
    const scaleX = drawW / imageWidth;
    const scaleY = drawH / imageHeight;

    controlPoints.forEach((cp, i) => {
      const x = offsetX + cp.img[0] * scaleX;
      const y = offsetY + cp.img[1] * scaleY;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#f97316';
      ctx.fillStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(i + 1, x + 9, y + 4);
    });
  }

  function handleClick(e) {
    if (!onImageClick) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cw = canvas.width, ch = canvas.height;

    // Recompute draw area (same logic as draw())
    const imgRatio = imageWidth / imageHeight;
    const canvasRatio = cw / ch;
    let drawW, drawH, offsetX, offsetY;
    if (imgRatio > canvasRatio) {
      drawW = cw; drawH = cw / imgRatio;
      offsetX = 0; offsetY = (ch - drawH) / 2;
    } else {
      drawH = ch; drawW = ch * imgRatio;
      offsetX = (cw - drawW) / 2; offsetY = 0;
    }

    // CSS click pos → canvas pixel (canvas is sized to match CSS)
    const cssScaleX = cw / rect.width;
    const cssScaleY = ch / rect.height;
    const cx = (e.clientX - rect.left) * cssScaleX;
    const cy = (e.clientY - rect.top) * cssScaleY;

    // Canvas pixel → image natural coords
    const x = (cx - offsetX) / (drawW / imageWidth);
    const y = (cy - offsetY) / (drawH / imageHeight);

    // Ignore clicks outside the image area
    if (x < 0 || y < 0 || x > imageWidth || y > imageHeight) return;
    onImageClick(x, y);
  }

  if (!imageUrl) return (
    <div className="image-placeholder">Charge une carte pour commencer</div>
  );

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      style={{ width: '100%', height: '100%', cursor: pendingImg ? 'crosshair' : 'default' }}
      onClick={handleClick}
    />
  );
}
