import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { createFontRenderedContainer, ensureFontsLoaded } from '../utils/fontUtils';

const AGENCY_LOGO = import.meta.env.VITE_AGENCY_LOGO || '';

const ProvisionalReceipt = ({ paymentId, saleId, onClose, onReceiptCompleted, onReceiptResponded }) => {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emissionNow] = useState(() => new Date());
  const [contact, setContact] = useState({
    email: '',
    phone: '',
    fromEmail: '',
    hasEmail: false,
    hasPhone: false
  });
  const [contactLoading, setContactLoading] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  /** null | 'whatsapp' | 'email' */
  const [previewKind, setPreviewKind] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [sendingFromPreview, setSendingFromPreview] = useState(false);

  const loadContact = useCallback(async () => {
    try {
      setContactLoading(true);
      const res = await api.get(`/api/receipts/recipient-contact?paymentId=${paymentId}`);
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setContact({
          email: d.email || '',
          phone: d.phone || '',
          fromEmail: d.fromEmail || '',
          hasEmail: !!d.hasEmail,
          hasPhone: !!d.hasPhone
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setContactLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    loadOrGenerateReceipt();
  }, [paymentId, saleId]);

  useEffect(() => {
    if (paymentId) loadContact();
  }, [paymentId, loadContact]);

  const loadOrGenerateReceipt = async () => {
    try {
      setLoading(true);
      setError('');

      const existingReceiptsResponse = await api.get(`/api/receipts?paymentId=${paymentId}`);

      if (existingReceiptsResponse.data.success &&
          existingReceiptsResponse.data.data.length > 0) {
        const existingReceipt = existingReceiptsResponse.data.data[0];
        setReceipt(existingReceipt);
      } else {
        await generateReceipt();
      }
    } catch (err) {
      console.error('Error loading receipt:', err);
      setError('No se pudo cargar el recibo');
    } finally {
      setLoading(false);
    }
  };

  const generateReceipt = async () => {
    try {
      const response = await api.post('/api/receipts/generate', {
        paymentId,
        saleId
      });

      if (response.data.success && response.data.data?.receipt) {
        setReceipt(response.data.data.receipt);
        if (onReceiptCompleted) onReceiptCompleted(paymentId);
        return;
      }

      setError(response.data?.message || 'No se pudo generar el recibo');
    } catch (err) {
      console.error('Receipt generation error:', err);
      setError(err.response?.data?.message || 'No se pudo generar el recibo');
    }
  };

  const createSimplifiedReceiptHTML = (rec) => {
    return `
      <div style="max-width: 400px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #6b7280;">Emisión: ${emissionNow.toLocaleString('es-AR')}</div>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 14px; color: #6b7280;">Monto:</span>
              <span style="font-weight: bold; font-size: 18px; color: #1f2937;">${rec.formattedPaymentAmount || ''}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 14px; color: #6b7280;">Fecha del pago:</span>
              <span style="font-weight: 600; color: #1f2937;">
                ${rec.paymentDetails?.paymentDate ? new Date(rec.paymentDetails.paymentDate).toLocaleDateString('es-AR') : ''}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 14px; color: #6b7280;">Método:</span>
              <span style="font-weight: 600; color: #1f2937;">${(rec.paymentDetails?.method || '').replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const fetchOutboundPreview = async () => {
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewData(null);
    try {
      const res = await api.get(
        `/api/receipts/outbound-preview?paymentId=${encodeURIComponent(paymentId)}&saleId=${encodeURIComponent(saleId)}`
      );
      if (res.data?.success && res.data.data) {
        setPreviewData(res.data.data);
      } else {
        setPreviewError(res.data?.message || 'No se pudo cargar la vista previa');
      }
    } catch (e) {
      setPreviewError(e.response?.data?.message || 'No se pudo cargar la vista previa');
    } finally {
      setPreviewLoading(false);
    }
  };

  const openPreview = async (kind) => {
    setInfoMessage('');
    setPreviewKind(kind);
    await fetchOutboundPreview();
  };

  const closePreview = () => {
    setPreviewKind(null);
    setPreviewData(null);
    setPreviewError('');
    setPreviewLoading(false);
  };

  const handleConfirmSendEmail = async () => {
    if (!contact.hasEmail) return;
    try {
      setSendingFromPreview(true);
      setError('');
      await api.post('/api/receipts/send-email', { paymentId, saleId });
      setEmailSent(true);
      setInfoMessage('');
      closePreview();
      if (onReceiptResponded) onReceiptResponded(paymentId);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo enviar el email');
    } finally {
      setSendingFromPreview(false);
    }
  };

  const handleConfirmWhatsapp = () => {
    closePreview();
    setInfoMessage('El envío por WhatsApp desde la app estará disponible próximamente. Podés copiar el texto de la vista previa.');
  };

  const downloadReceipt = async () => {
    if (!receipt) return;
    try {
      await ensureFontsLoaded();
      const container = createFontRenderedContainer();
      const html = createSimplifiedReceiptHTML(receipt);
      container.innerHTML = html;
      document.body.appendChild(container);

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recibo-${receipt.receiptNumber || paymentId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');

      document.body.removeChild(container);
    } catch (err) {
      console.error('Download error:', err);
      setError('No se pudo descargar el recibo');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando recibo…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !receipt && !previewKind) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <div className="text-gray-800 text-lg mb-4">{error}</div>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={loadOrGenerateReceipt} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                Reintentar
              </button>
              <button type="button" onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md text-center">
          <p className="text-gray-800 mb-4">Preparando recibo…</p>
          <button type="button" onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cerrar</button>
        </div>
      </div>
    );
  }

  const showManualHint = !contactLoading && !contact.hasEmail && !contact.hasPhone;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white max-w-md w-full rounded-lg shadow-xl border max-h-[90vh] overflow-y-auto">
          <div className="p-4">
            <div className="flex flex-col items-center mb-4">
              {AGENCY_LOGO ? (
                <img src={AGENCY_LOGO} alt="" className="h-16 w-auto object-contain mb-2" />
              ) : null}
              <p className="text-xs text-gray-600 text-center">
                Emisión del recibo:{' '}
                <span className="font-semibold text-gray-900">
                  {emissionNow.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' })}
                </span>
              </p>
            </div>

            {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
            {infoMessage ? <div className="mb-3 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded p-2">{infoMessage}</div> : null}
            {emailSent ? <div className="mb-3 text-sm text-green-700">Email enviado correctamente.</div> : null}

            <div id="receipt-content" className="bg-white rounded-lg border border-gray-200 p-4 notranslate" translate="no">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Monto</span>
                  <span className="font-bold text-lg text-black">{receipt.formattedPaymentAmount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Fecha del pago</span>
                  <span className="font-semibold text-black">
                    {receipt.paymentDetails?.paymentDate
                      ? new Date(receipt.paymentDetails.paymentDate).toLocaleDateString('es-AR')
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Método de pago</span>
                  <span className="font-semibold text-black capitalize">
                    {(receipt.paymentDetails?.method || '').replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-stretch">
                {contact.hasPhone ? (
                  <div className="flex-1 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => openPreview('whatsapp')}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-700"
                    >
                      Enviar x Whapp
                    </button>
                    <p className="text-xs text-gray-600 text-center break-all">
                      <span className="text-gray-500">Tel. destino: </span>
                      <span className="font-medium text-gray-900">{contact.phone || '—'}</span>
                    </p>
                  </div>
                ) : null}
                {contact.hasEmail ? (
                  <div className="flex-1 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => openPreview('email')}
                      disabled={emailSent}
                      className={`w-full px-4 py-2 rounded-lg font-semibold text-sm ${
                        emailSent
                          ? 'bg-blue-300 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Enviar x email
                    </button>
                    <p className="text-xs text-gray-600 text-center break-all">
                      <span className="text-gray-500">Destino: </span>
                      <span className="font-medium text-gray-900">{contact.email || '—'}</span>
                    </p>
                    <p className="text-xs text-gray-600 text-center break-all">
                      <span className="text-gray-500">Origen: </span>
                      <span className="font-medium text-gray-900">{contact.fromEmail || '—'}</span>
                    </p>
                  </div>
                ) : null}
              </div>
              {showManualHint ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 text-center">
                  El cliente no tiene cargado email ni Whapp: copie este recibo y envíelo manualmente.
                </p>
              ) : null}
            </div>

            <div className="flex justify-center gap-3 pt-4 border-t border-gray-200 mt-4">
              <button
                type="button"
                onClick={downloadReceipt}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold text-sm"
              >
                Descargar
              </button>
              <button type="button" onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 font-semibold text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewKind ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white max-w-lg w-full rounded-lg shadow-2xl border max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {previewKind === 'whatsapp' ? 'Vista previa — WhatsApp' : 'Vista previa — Email'}
              </h2>
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {previewLoading ? (
                <div className="flex flex-col items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3" />
                  <p className="text-sm text-gray-600">Cargando contenido…</p>
                </div>
              ) : null}
              {previewError ? <div className="text-sm text-red-600 mb-3">{previewError}</div> : null}
              {!previewLoading && previewData && previewKind === 'whatsapp' ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">
                    Se enviaría al número: <span className="font-semibold text-gray-900">{previewData.phone || contact.phone}</span>
                  </p>
                  <label className="block text-xs font-medium text-gray-500">Mensaje</label>
                  <textarea
                    readOnly
                    className="w-full min-h-[200px] text-sm border border-gray-300 rounded-md p-3 font-mono bg-gray-50"
                    value={previewData.whatsappText || ''}
                  />
                </div>
              ) : null}
              {!previewLoading && previewData && previewKind === 'email' ? (
                <div className="space-y-3">
                  <div className="text-xs space-y-1">
                    <p>
                      <span className="text-gray-500">Destino: </span>
                      <span className="font-semibold text-gray-900">{previewData.toEmail || contact.email}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Origen: </span>
                      <span className="font-semibold text-gray-900">{previewData.fromEmail || contact.fromEmail}</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Asunto</label>
                    <p className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-gray-50">{previewData.emailSubject}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cuerpo</label>
                    <div
                      className="text-sm border border-gray-200 rounded-md p-3 bg-white max-h-[40vh] overflow-y-auto [&_p]:my-1"
                      dangerouslySetInnerHTML={{ __html: previewData.emailHtml || '' }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={closePreview}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-sm"
              >
                Cancelar
              </button>
              {previewKind === 'whatsapp' ? (
                <button
                  type="button"
                  onClick={handleConfirmWhatsapp}
                  disabled={previewLoading || !previewData}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Enviar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmSendEmail}
                  disabled={previewLoading || !previewData || emailSent || sendingFromPreview}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {sendingFromPreview ? 'Enviando…' : 'Enviar'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ProvisionalReceipt;
