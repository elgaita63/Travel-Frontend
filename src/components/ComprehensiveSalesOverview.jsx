import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatNumbers';
import CurrencyDisplay from './CurrencyDisplay';
import api from '../utils/api';

const ComprehensiveSalesOverview = ({ sales, onSaleClick, loading = false, selectedCurrency = 'ARS' }) => {
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [allUsers, setAllUsers] = useState([]);
  const [allServices, setAllServices] = useState([]); 
  
  // Estados para filtros
  const [selectedPassenger, setSelectedPassenger] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get('/api/users?limit=100');
        if (userRes.data.success) setAllUsers(userRes.data.data.users);
        const serviceRes = await api.get('/api/services?limit=1000');
        if (serviceRes.data.success) setAllServices(serviceRes.data.data.services);
      } catch (err) {
        console.error("Error cargando datos maestros", err);
      }
    };
    fetchData();
  }, []);

  const getSafeId = (idObj) => {
    if (!idObj) return null;
    if (typeof idObj === 'string') return idObj;
    return idObj.$oid || (idObj._id ? (typeof idObj._id === 'string' ? idObj._id : idObj._id.$oid) : idObj.toString());
  };

  const uniquePassengers = React.useMemo(() => {
    if (!sales) return [];
    const names = sales.map(s => `${s.clientId?.name || ''} ${s.clientId?.surname || ''}`.trim().toUpperCase()).filter(n => n !== "");
    return ['all', ...new Set(names)];
  }, [sales]);

  const uniqueProviders = React.useMemo(() => {
    if (!sales) return [];
    const provs = [];
    sales.forEach(sale => {
      sale.services?.forEach(srv => {
        const mSrv = allServices.find(ms => getSafeId(ms._id) === getSafeId(srv.serviceId));
        provs.push((mSrv?.providerId?.name || srv.providerId?.name || 'PROV. DESCONOCIDO').toUpperCase());
      });
    });
    return ['all', ...new Set(provs)];
  }, [sales, allServices]);

  const filteredSales = React.useMemo(() => {
    if (!sales) return [];
    let result = sales.filter(sale => sale.saleCurrency === selectedCurrency);

    if (selectedPassenger !== 'all') {
      result = result.filter(sale => `${sale.clientId?.name || ''} ${sale.clientId?.surname || ''}`.trim().toUpperCase() === selectedPassenger);
    }

    if (selectedProvider !== 'all') {
      result = result.filter(sale => sale.services?.some(srv => {
        const mSrv = allServices.find(ms => getSafeId(ms._id) === getSafeId(srv.serviceId));
        const pName = (mSrv?.providerId?.name || srv.providerId?.name || 'PROV. DESCONOCIDO').toUpperCase();
        return pName === selectedProvider;
      }));
    }
    return result;
  }, [sales, selectedCurrency, selectedPassenger, selectedProvider, allServices]);

  const sortedSales = React.useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      let aV, bV;
      switch (sortBy) {
        case 'createdAt': aV = new Date(a.createdAt); bV = new Date(b.createdAt); break;
        case 'passenger': aV = (a.clientId?.name + a.clientId?.surname).toLowerCase(); bV = (b.clientId?.name + b.clientId?.surname).toLowerCase(); break;
        case 'seller': aV = (a.createdBy?.fullName || '').toLowerCase(); bV = (b.createdBy?.fullName || '').toLowerCase(); break;
        default: aV = a[sortBy] || 0; bV = b[sortBy] || 0;
      }
      return sortOrder === 'asc' ? (aV > bV ? 1 : -1) : (aV < bV ? 1 : -1);
    });
  }, [filteredSales, sortBy, sortOrder]);

  const totals = React.useMemo(() => {
    const sellersIds = new Set();
    let sumPasajero = 0;
    let sumProveedor = 0;
    filteredSales.forEach(s => {
      const sId = getSafeId(s.createdBy);
      if (sId) sellersIds.add(sId);
      sumPasajero += (s.clientBalance || 0);
      sumProveedor += (s.providerBalance || 0);
    });
    const sumVendedores = allUsers
      .filter(u => sellersIds.has(getSafeId(u._id)))
      .reduce((acc, u) => acc + (u[selectedCurrency === 'ARS' ? 'saldoArs' : 'saldoUsd'] || 0), 0);
    return { sumVendedores, sumPasajero, sumProveedor };
  }, [filteredSales, allUsers, selectedCurrency]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const getSortIcon = (field) => (sortBy !== field ? '↕️' : sortOrder === 'asc' ? '↑' : '↓');
  const getAmountColor = (amount) => (amount < 0 ? 'text-red-400' : 'text-green-400');

  const BalanceCell = ({ amount, currency, className = "" }) => {
    const symbol = currency === 'USD' ? 'U$D' : 'AR$';
    const symbolColor = currency === 'USD' ? 'text-green-300' : 'text-cyan-400';
    return (
      <div className={`text-right font-medium ${getAmountColor(amount)} ${className}`}>
        <span className={`${symbolColor} mr-1`}>{symbol}</span>
        {Math.abs(amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-20 w-20 border-4 border-t-primary-500"></div></div>;

  return (
    <div className="space-y-6">
      <div className="px-2">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-white/10 table-auto">
              <thead className="bg-dark-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark-300 uppercase cursor-pointer" onClick={() => handleSort('createdAt')}>Fecha {getSortIcon('createdAt')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark-300 uppercase max-w-[250px]">
                    <div className="flex flex-col space-y-1">
                      <span className="cursor-pointer text-base" onClick={() => handleSort('passenger')}>Pasajero {getSortIcon('passenger')}</span>
                      <select className="bg-dark-800 border border-white/10 rounded text-[10px] py-1 px-1 focus:outline-none text-dark-100 font-normal uppercase" value={selectedPassenger} onChange={(e) => setSelectedPassenger(e.target.value)} onClick={(e)=>e.stopPropagation()}>
                        {uniquePassengers.map(p => <option key={p} value={p}>{p === 'all' ? 'TODOS LOS PASAJEROS' : p}</option>)}
                      </select>
                      <span className="text-sm text-dark-200">Destino</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark-300 uppercase">
                    <div className="flex flex-col space-y-1">
                      <span className="cursor-pointer" onClick={() => handleSort('provider')}>Proveedor {getSortIcon('provider')}</span>
                      <select className="bg-dark-800 border border-white/10 rounded text-[10px] py-1 px-1 focus:outline-none text-dark-100 font-normal uppercase" value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)} onClick={(e)=>e.stopPropagation()}>
                        {uniqueProviders.map(p => <option key={p} value={p}>{p === 'all' ? 'TODOS LOS PROV' : p}</option>)}
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark-300 uppercase cursor-pointer" onClick={() => handleSort('seller')}>Vendedor {getSortIcon('seller')}</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-dark-300 uppercase">Comisión</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-dark-300 uppercase">
                    <div className="flex flex-col leading-tight"><span>Precio</span><span>Costo</span><span>Ganancia</span></div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-dark-300 uppercase">Margen</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-dark-300 uppercase">
                    <div className="flex flex-col leading-tight"><span>Saldos</span><span>Pasajero</span><span>Proveedor</span></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedSales.map((sale) => {
                  const profitMargin = sale.totalSalePrice > 0 ? (sale.profit / sale.totalSalePrice) * 100 : 0;
                  const sellerName = (sale.createdBy?.fullName || sale.createdBy?.username || 'SISTEMA').toUpperCase();
                  const sellerId = getSafeId(sale.createdBy);
                  const userInMaster = allUsers.find(u => getSafeId(u._id) === sellerId);
                  const comisionPct = Number(userInMaster?.comision || sale.createdBy?.comision || 0);
                  const comisionImp = (sale.profit || 0) * (comisionPct / 100);
                  const sInfo = sale.services?.[0];
                  const mServ = allServices.find(ms => getSafeId(ms._id) === getSafeId(sInfo?.serviceId));
                  const destino = (mServ?.destino || sInfo?.serviceName || 'N/A').toUpperCase();

                  return (
                    <tr key={getSafeId(sale._id)} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onSaleClick && onSaleClick(sale)}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-dark-100">{new Date(sale.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4 max-w-[250px]">
                        <div className="text-base font-bold text-dark-100 truncate">{sale.clientId?.name} {sale.clientId?.surname}</div>
                        <div className="text-sm text-white/80 mt-0.5 truncate">{destino}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-[11px] text-white/60 flex flex-col">
                          {sale.services?.map((srv, i) => {
                            const ms = allServices.find(x => getSafeId(x._id) === getSafeId(srv.serviceId));
                            return <span key={i}>• {(ms?.providerId?.name || srv.providerId?.name || 'N/A').toUpperCase()}</span>;
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-dark-100">{sellerName}</div>
                        <div className="text-[11px] font-bold text-primary-400 mt-1">
                          Saldo: {formatCurrency(userInMaster?.[sale.saleCurrency === 'ARS' ? 'saldoArs' : 'saldoUsd'] || 0, sale.saleCurrency)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-sm font-bold text-accent-400"><CurrencyDisplay>{formatCurrency(comisionImp, selectedCurrency)}</CurrencyDisplay></div>
                        <div className="text-[10px] text-dark-400">({comisionPct}%)</div>
                      </td>
                      <td className="px-4 py-4 text-right space-y-1">
                        <div className="text-sm text-dark-100 font-medium"><CurrencyDisplay>{formatCurrency(sale.totalSalePrice, selectedCurrency)}</CurrencyDisplay></div>
                        <div className="text-sm text-dark-300"><CurrencyDisplay>{formatCurrency(sale.totalCost, selectedCurrency)}</CurrencyDisplay></div>
                        <div className={`text-sm font-bold ${getAmountColor(sale.profit)}`}><CurrencyDisplay>{formatCurrency(sale.profit, selectedCurrency)}</CurrencyDisplay></div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-dark-100">{profitMargin.toFixed(1)}%</td>
                      <td className="px-4 py-4 space-y-1">
                        <BalanceCell amount={sale.clientBalance || 0} currency={selectedCurrency} className="text-sm" />
                        <BalanceCell amount={sale.providerBalance || 0} currency={selectedCurrency} className="text-sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-dark-800/90 border-t-2 border-primary-500/50">
                <tr>
                  <td colSpan="3" className="px-4 py-6 text-left text-base font-bold text-primary-400 uppercase tracking-wide">Saldos/Balances Vendedores/Pasajeros/Proveedores</td>
                  <td className="px-4 py-6">
                    <div className="text-xs text-dark-300 uppercase mb-1">Balance Vendedores</div>
                    <BalanceCell amount={totals.sumVendedores} currency={selectedCurrency} className="text-lg font-bold" />
                  </td>
                  <td colSpan="3" className="px-4 py-6 text-right">
                    <div className="text-base font-bold text-dark-200 uppercase">Balance Pasajeros/Proveedor</div>
                  </td>
                  <td className="px-4 py-6 space-y-2">
                    <BalanceCell amount={totals.sumPasajero} currency={selectedCurrency} className="text-lg font-bold" />
                    <BalanceCell amount={totals.sumProveedor} currency={selectedCurrency} className="text-lg font-bold" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveSalesOverview;