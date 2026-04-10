import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import SellerBalanceLedgerModal from '../components/SellerBalanceLedgerModal';

const formatBal = (n, cur) => {
  const v = parseFloat(n || 0);
  const sym = cur === 'ARS' ? '$' : 'U$D ';
  return `${sym}${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const UserSellerProfile = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ledgerOpen, setLedgerOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/users/${id}`);
        if (cancelled) return;
        if (res.data?.success) {
          setUser(res.data.data.user);
        } else {
          setError(res.data?.message || 'No se pudo cargar el usuario');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.message || 'Error al cargar el perfil');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || '—';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="text-sm text-dark-400 hover:text-primary-400 transition-colors"
        >
          ← Volver
        </Link>
      </div>

      <div className="card p-6">
        <h1 className="text-2xl font-bold text-dark-100 mb-1">Perfil vendedor</h1>
        <p className="text-dark-400 text-sm mb-6">Saldos globales del usuario (todas las ventas)</p>

        {loading && <p className="text-dark-400">Cargando…</p>}
        {!loading && error && (
          <div className="notification border-error-500/30 text-error-400 text-sm">{error}</div>
        )}
        {!loading && !error && user && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-sm font-semibold">
                {displayName}
              </span>
              {user.role && (
                <span className="text-xs uppercase tracking-wider text-dark-500">
                  {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-tight mb-1">
                  Balance ARS
                </div>
                <div className="text-xl font-black text-dark-100 font-mono">
                  {formatBal(user.balance?.ars, 'ARS')}
                </div>
              </div>
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <div className="text-xs font-bold text-green-400 uppercase tracking-tight mb-1">
                  Balance USD
                </div>
                <div className="text-xl font-black text-dark-100 font-mono">
                  {formatBal(user.balance?.usd, 'USD')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLedgerOpen(true)}
              className="btn-primary w-full sm:w-auto"
            >
              Ver movimientos (créditos y débitos)
            </button>
          </>
        )}
      </div>

      {ledgerOpen && id && (
        <SellerBalanceLedgerModal userId={id} onClose={() => setLedgerOpen(false)} />
      )}
    </div>
  );
};

export default UserSellerProfile;
