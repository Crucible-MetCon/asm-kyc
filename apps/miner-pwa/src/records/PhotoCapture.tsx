import { useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface PhotoItem {
  id?: string;
  photo_data: string;
}

interface Props {
  photos: PhotoItem[];
  onAdd: (dataUri: string) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  maxPhotos?: number;
}

function resizeImage(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function PhotoCapture({ photos, onAdd, onRemove, disabled, maxPhotos = 5 }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = !disabled && photos.length < maxPhotos;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await resizeImage(file, 1024, 0.7);
      onAdd(dataUri);
    } catch {
      // silent fail on resize error
    }
    // Reset input so the same file can be selected again
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        {t.records.photos}
        {photos.length > 0 && (
          <span style={{ fontWeight: 400, marginLeft: 8 }}>
            {photos.length}/{maxPhotos}
          </span>
        )}
      </label>
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <div key={photo.id || i} className="photo-thumb">
            <img src={photo.photo_data} alt="" />
            {!disabled && (
              <button
                type="button"
                className="photo-thumb-remove"
                onClick={() => onRemove(i)}
                aria-label={t.records.removePhoto}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            className="photo-add-btn"
            onClick={() => inputRef.current?.click()}
          >
            <span style={{ fontSize: 24 }}>📷</span>
            <span>{t.records.addPhoto}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {photos.length >= maxPhotos && (
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          {t.records.maxPhotos}
        </p>
      )}
    </div>
  );
}
