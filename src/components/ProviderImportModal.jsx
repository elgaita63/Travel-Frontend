import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import PassportImagePasteArea from './PassportImagePasteArea';

/**
 * Importación masiva de proveedores con IA (solo Super).
 * Archivo: imagen, CSV, Excel, texto; opcional: texto libre + pegar imagen.
 */
const ProviderImportModal = ({ isOpen, onClose, onImported }) => {
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState(null);
  const [pastedImage, setPastedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [selected, setSelected] = useState(() => new Set());

  const reset = useCallback(() => {
    setPastedText('');
    setFile(null);
    setPastedImage(null);
    setPreviewUrl('');
    setError('');
    setPreviewRows([]);
    setSelected(new Set());
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const applyFile = (f) => {
    setFile(f || null);
    setPastedImage(null);
    if (f && f.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl('');
    }
  };

  const applyPastedImage = (f) => {
    if (!f) return;
    setPastedImage(f);
    setFile(null);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleAnalyze = async () => {
    setError('');
    const fd = new FormData();
    const upload = file || pastedImage;
    if (upload) fd.append('file', upload);
    if (pastedText.trim()) fd.append('pastedText', pastedText.trim());

    if (!upload && !pastedText.trim()) {
      setError('Subí un archivo o pegá imagen / texto.');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await api.post('/api/providers/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (!res.data.success) {
        setError(res.data.message || 'No se pudo analizar');
        return;
      }
      const rows = res.data.data?.providers || [];
      setPreviewRows(rows);
      setSelected(new Set(rows.map((_, i) => i)));
      if (rows.length === 0) {
        setError('La IA no detectó proveedores. Probá con más contexto o otra captura.');
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Error al analizar';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleRow = (i) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === previewRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(previewRows.map((_, i) => i)));
    }
  };

  const handleCommit = async () => {
    const toSend = previewRows.filter((_, i) => selected.has(i));
    if (!toSend.length) {
      setError('Seleccioná al menos un proveedor.');
      return;
    }
    setCommitting(true);
    setError('');
    try {
      const res = await api.post('/api/providers/import/commit', { providers: toSend });
      if (!res.data.success) {
        setError(res.data.message || 'No se pudo importar');
        return;
      }
      const msg = res.data.message || 'Importación finalizada';
      toast.success(msg);
      if (onImported) onImported();
      handleClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Error al importar');
    } finally {
      setCommitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="bg-dark-800 border border-white/10 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">Importar proveedores (IA)</h2>
            <p className="text-xs text-dark-400 mt-1">
              Solo Super. Podés subir imagen, CSV, Excel o .txt, pegar captura y/o texto. El prompt está en el servidor;
              opcional: variable <span className="font-mono">PROVIDERS_IMPORT_PROMPT_SUFFIX</span> en el backend.
            </p>
          </div>
          <button type="button" onClick={handleClose} className="text-dark-400 hover:text-dark-100 p-2 rounded-lg">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-300 text-sm px-3 py-2 rounded-md">{error}</div>
          )}
          {previewRows.length === 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Texto libre (opcional)</label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={4}
                  className="input-field w-full text-sm"
                  placeholder="Pegá lista, CSV pegado, notas, columnas copiadas de Excel…"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Subir archivo</label>
                  <input
                    type="file"
                    accept="image/*,.csv,.txt,.tsv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => applyFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-dark-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-500/20 file:text-primary-300"
                  />
                  <p className="text-[11px] text-dark-500 mt-1">
                    Imagen (lista escaneada, captura), CSV, Excel o texto. PDF: usá captura de pantalla.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Pegar imagen</label>
                  <PassportImagePasteArea onImageFile={applyPastedImage} disabled={analyzing} />
                </div>
              </div>

              {previewUrl && (
                <div className="rounded-lg border border-white/10 p-2 bg-dark-900/40">
                  <p className="text-xs text-dark-400 mb-2">Vista previa</p>
                  <img src={previewUrl} alt="" className="max-h-40 object-contain mx-auto rounded" />
                </div>
              )}

              <button
                type="button"
                disabled={analyzing}
                onClick={handleAnalyze}
                className="btn-primary w-full sm:w-auto disabled:opacity-50"
              >
                {analyzing ? 'Analizando con IA…' : 'Analizar con IA'}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-dark-300">
                  {previewRows.length} proveedor(es) detectado(s). Desmarcá los que no quieras importar.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={toggleAll} className="btn-secondary text-sm px-3 py-1">
                    {selected.size === previewRows.length ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewRows([]);
                      setSelected(new Set());
                    }}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    Volver a cargar
                  </button>
                </div>
              </div>

              <div className="border border-white/10 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-dark-700 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 w-10"></th>
                      <th className="px-2 py-2 text-left text-dark-300">Nombre</th>
                      <th className="px-2 py-2 text-left text-dark-300">Email</th>
                      <th className="px-2 py-2 text-left text-dark-300">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selected.has(i)}
                            onChange={() => toggleRow(i)}
                            className="rounded border-white/20"
                          />
                        </td>
                        <td className="px-2 py-2 text-dark-100">{row.name}</td>
                        <td className="px-2 py-2 text-dark-300">{row.contactInfo?.email || '—'}</td>
                        <td className="px-2 py-2 text-dark-300">{row.contactInfo?.phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={committing || selected.size === 0}
                  onClick={handleCommit}
                  className="btn-primary disabled:opacity-50"
                >
                  {committing ? 'Importando…' : `Importar ${selected.size} proveedor(es)`}
                </button>
                <button type="button" onClick={handleClose} className="btn-secondary">
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderImportModal;
