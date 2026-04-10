import React, { useEffect, useMemo } from 'react';
import {
  RELEASE_NOTES_TITLE,
  BACKLOG_RAW_ITEMS,
  BACKLOG_ADMIN_SUMMARIES,
} from '../data/releaseNotes';

/**
 * Super (isSuper): backlog literal.
 * Admin (role admin, no super): mismos ítems en versión resumida.
 */
const ReleaseNotesModal = ({ isOpen, onClose, isSuper }) => {
  const lines = useMemo(
    () => (isSuper ? BACKLOG_RAW_ITEMS : BACKLOG_ADMIN_SUMMARIES),
    [isSuper]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-notes-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-dark-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-white/10">
          <div>
            <h2 id="release-notes-title" className="text-lg font-semibold text-dark-100 font-poppins leading-snug">
              {RELEASE_NOTES_TITLE}
            </h2>
            <p className="text-xs text-dark-400 mt-2">
              {isSuper
                ? 'Texto del backlog tal como está cargado.'
                : 'Resumen ejecutivo (administrador), mismo orden que el backlog.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-700/80 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar px-6 py-4">
          <div className="space-y-4 text-sm text-dark-200 leading-relaxed">
            {lines.map((text, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap break-words"
              >
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReleaseNotesModal;
