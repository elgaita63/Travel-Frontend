import React from 'react';
import { getImageFileFromPasteEvent } from '../utils/clipboardImage';

/**
 * Recibe la imagen pegada con Ctrl+V / ⌘+V cuando el foco está en este recuadro.
 */
const PassportImagePasteArea = ({ onImageFile, disabled = false }) => {
  const handlePaste = (e) => {
    if (disabled) return;
    const file = getImageFileFromPasteEvent(e);
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    onImageFile(file);
  };

  return (
    <div
      tabIndex={disabled ? -1 : 0}
      onPaste={handlePaste}
      className={`rounded-lg border border-dashed border-white/20 bg-dark-800/30 px-3 py-3 text-center transition-colors ${
        disabled
          ? 'opacity-50 pointer-events-none'
          : 'cursor-default hover:border-primary-500/35 focus:outline-none focus:ring-2 focus:ring-primary-500/35'
      }`}
    >
      <p className="text-xs font-medium text-dark-300">Pegar imagen desde el portapapeles</p>
      <p className="text-[11px] text-dark-500 mt-1">
        Hacé clic en este recuadro y pulsá Ctrl+V (⌘+V en Mac)
      </p>
    </div>
  );
};

export default PassportImagePasteArea;
