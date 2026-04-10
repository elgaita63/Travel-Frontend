import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const formatMoney = (amount, currency) => {
  const n = parseFloat(amount || 0);
  const sym = currency === 'ARS' ? '$' : 'U$D ';
  return `${sym}${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Asegura string hex 24 para la ruta /sales/:id (evita [object Object]). */
const saleIdForRoute = (raw) => {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw._id != null) return saleIdForRoute(raw._id);
  if (typeof raw?.toString === 'function') {
    const s = raw.toString();
    if (s && s !== '[object Object]') return s;
  }
  return '';
};

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SellerBalanceLedgerModal = ({ userId, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/users/${userId}/balance-ledger`);
        if (cancelled) return;
        if (res.data?.success) {
          setPayload(res.data.data);
        } else {
          setError(res.data?.message || 'No se pudo cargar el libro');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.message || 'Error al cargar movimientos');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const u = payload?.user;
  const entries = payload?.entries || [];
  const credits = entries.filter((e) => e.kind === 'credit');
  const debits = entries.filter((e) => e.kind === 'debit');

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-content p-6 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="ledger-title"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 id="ledger-title" className="text-xl font-bold text-dark-100">
              Movimientos de saldo
            </h3>
            {u && (
              <p className="text-sm text-dark-400 mt-1">
                {u.username}
                {u.firstName || u.lastName ? ` · ${[u.firstName, u.lastName].filter(Boolean).join(' ')}` : ''}
              </p>
            )}
            {u?.balance && (
              <div className="flex flex-wrap gap-3 mt-3 text-sm">
                <span className="px-2 py-1 rounded bg-primary-500/10 border border-primary-500/20 text-primary-300 font-mono">
                  ARS: {formatMoney(u.balance.ars, 'ARS')}
                </span>
                <span className="px-2 py-1 rounded bg-success-500/10 border border-success-500/20 text-success-300 font-mono">
                  USD: {formatMoney(u.balance.usd, 'USD')}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-white/5"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-dark-500 mb-4">
          Créditos: comisiones por ventas cerradas. Débitos: pagos registrados al vendedor.
        </p>

        {loading && (
          <div className="py-12 text-center text-dark-400">Cargando…</div>
        )}
        {!loading && error && (
          <div className="notification border-error-500/30 text-error-400 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <div className="overflow-y-auto flex-1 space-y-6 pr-1 -mr-1">
            <LedgerBlock
              title="Créditos (comisiones)"
              empty="No hay comisiones registradas."
              rows={credits}
              navigate={navigate}
              onClose={onClose}
            />
            <LedgerBlock
              title="Débitos (pagos al vendedor)"
              empty="No hay pagos al vendedor registrados."
              rows={debits}
              navigate={navigate}
              onClose={onClose}
            />
          </div>
        )}

        <div className="flex justify-end pt-4 mt-4 border-t border-white/10">
          <button type="button" onClick={onClose} className="btn-primary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

function LedgerBlock({ title, empty, rows, navigate, onClose }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-dark-200 uppercase tracking-wide mb-2">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-dark-500 py-2">{empty}</p>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-700/40 text-left text-[11px] uppercase tracking-wider text-dark-400">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Monto</th>
                <th className="px-3 py-2 font-semibold">Venta</th>
                <th className="px-3 py-2 font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row._id} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2 text-dark-300 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td
                    className={`px-3 py-2 font-mono font-medium whitespace-nowrap ${
                      row.kind === 'credit' ? 'text-success-400' : 'text-warning-400'
                    }`}
                  >
                    {row.kind === 'credit' ? '+' : '−'}
                    {formatMoney(row.amount, row.currency)} {row.currency}
                  </td>
                  <td className="px-3 py-2 text-dark-300 max-w-[140px]">
                    {saleIdForRoute(row.saleId) ? (
                      <button
                        type="button"
                        className="text-primary-400 hover:text-primary-300 underline text-left truncate max-w-full"
                        title={row.saleName || 'Ver venta'}
                        onClick={() => {
                          const sid = saleIdForRoute(row.saleId);
                          if (!sid) return;
                          onClose();
                          navigate(`/sales/${sid}`);
                        }}
                      >
                        {row.saleName || 'Ver venta'}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-dark-400 text-xs max-w-[200px] break-words">
                    {row.notes || '—'}
                    {row.method ? (
                      <span className="block text-dark-500 mt-0.5">Medio: {row.method}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SellerBalanceLedgerModal;
