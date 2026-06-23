import { useRef, useEffect } from 'react';

export default function ImageCanvas({ imageUrl, imageWidth, imageHeight, controlPoints, pendingImg, onImageClick }) {
  const canvasRef = useRef();
  const imgRef = useRef();

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => { draw(); }, [controlPoints, pendingImg]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / imageWidth;
    const scaleY = canvas.height / imageHeight;

    controlPoints.forEach((cp, i) => {
      const x = cp.img[0] * scaleX;
      const y = cp.img[1] * scaleY;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#f97316';
      ctx.fillStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = '11px sans-serif';
      ctx.fillText(i + 1, x + 9, y + 4);
    });
  }

  function handleClick(e) {
    if (!onImageClick) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = imageWidth / canvas.width;
    const scaleY = imageHeight / canvas.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
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
      style={{ width: '100%', height: '100%', cursor: pendingImg ? 'crosshair' : 'default', objectFit: 'contain' }}
      onClick={handleClick}
      onMouseMove={() => draw()}
    />
  );
}
