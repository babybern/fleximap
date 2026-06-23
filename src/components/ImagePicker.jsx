import { useRef } from 'react';

export default function ImagePicker({ onImage }) {
  const inputRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => onImage(url, img.naturalWidth, img.naturalHeight);
    img.src = url;
  };

  return (
    <button
      className="btn"
      onClick={() => inputRef.current.click()}
    >
      Charger une carte
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </button>
  );
}
