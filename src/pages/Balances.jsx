import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';

const Balances = () => {
  const [filterType, setFilterType] = useState('passengers');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [allSales, setAllSales] = useState([]);
  const [usersMap, setUsersMap] = useState({}); 
  const [selectedEntity, setSelectedEntity] = useState('Todos');
  const [loading, setLoading] = useState(false);
  
  // Detalle de payments al final del listado
  const [salePayments, setSalePayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [salesRes, usersRes] = await Promise.all([
          api.get(`/api/sales?startDate=${startDate}&endDate=${endDate}&limit=1000`),
          api.get('/api/users?limit=100')
        ]);

        if (usersRes.data.success) {
          const uMap = {};
          usersRes.data.data.users.forEach(u => {
            uMap[u._id] = u.username || u.name || "S/D";
          });
          setUsersMap(uMap);
        }

        if (salesRes.data.success) {
          setAllSales(salesRes.data.data.sales);
          setSelectedEntity('Todos');
        }
      } catch (error) {
        console.error("Error cargando balances:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]);

  const getVentaInfo = (sale) => {
    const p = sale.passengers && sale.passengers[0] ? sale.passengers[0] : null;
    const pInfo = p?.passengerId || p;
    const vendedorId = typeof sale.createdBy === 'object' ? sale.createdBy?._id : sale.createdBy;
    const vendedorNombre = usersMap[vendedorId] || "Sistema";
    const proveedores = (sale.services || []).map(s => (s.providerName || s.providerId?.name || 'S/D').toUpperCase());

    return {
      apellido: (pInfo?.surname || 'S/D').toUpperCase(),
      nombre: pInfo?.name || 'S/D',
      vendedor: vendedorNombre,
      proveedores
    };
  };

  const uniqueEntities = useMemo(() => {
    let listado = [];
    if (filterType === 'passengers') {
      listado = allSales.map(sale => getVentaInfo(sale).apellido);
    } else {
      allSales.forEach(sale => { listado = [...listado, ...getVentaInfo(sale).proveedores]; });
    }
    return ['Todos', ...new Set(listado)].sort();
  }, [allSales, filterType, usersMap]);

  const displayedItems = useMemo(() => {
    if (selectedEntity === 'Todos') return allSales;
    return allSales.filter(sale => {
      const info = getVentaInfo(sale);
      return filterType === 'passengers' ? info.apellido === selectedEntity : info.proveedores.includes(selectedEntity);
    });
  }, [selectedEntity, allSales, filterType, usersMap]);

  // Lógica para detallar pagos asociados a las ventas seleccionadas
  useEffect(() => {
    const fetchPaymentsForSelection = async () => {
      if (selectedEntity === 'Todos' || displayedItems.length === 0) {
        setSalePayments([]);
        return;
      }

      setLoadingPayments(true);
      try {
        const res = await api.get('/api/payments?limit=5000');
        if (res.data.success) {
          const allPayments = res.data.data.payments || res.data.data || [];
          const saleIds = displayedItems.map(s => s._id);
          
          const filtered = allPayments.filter(p => {
            const pSaleId = typeof p.saleId === 'object' ? p.saleId?._id : p.saleId;
            return saleIds.includes(pSaleId);
          });
          setSalePayments(filtered);
        }
      } catch (error) {
        console.error("Error al buscar pagos asociados:", error);
        setSalePayments([]);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPaymentsForSelection();
  }, [selectedEntity, displayedItems]);

  const totals = useMemo(() => {
    return displayedItems.reduce((acc, sale) => {
      const curr = sale.saleCurrency || 'USD';
      if (!acc[curr]) acc[curr] = { balance: 0 };
      acc[curr].balance += sale.clientBalance || 0;
      return acc;
    }, {});
  }, [displayedItems]);

  const getCurrencyStyle = (curr) => (curr === 'ARS' ? 'text-sky-400 font-bold' : curr === 'USD' ? 'text-green-800 font-bold' : 'text-white');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white mb-6 gradient-text tracking-tighter ">Saldos/Balances/Conciliaciones de Pasajeros/Proveedores</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6 card-glass rounded-xl border border-white/10 shadow-2xl">
        <div>
          <label className="block text-xs font-semibold text-dark-300 uppercase mb-2">Ver por</label>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setSelectedEntity('Todos'); }} className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10 outline-none">
            <option value="passengers">Pasajeros</option>
            <option value="providers">Proveedores</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-dark-300 uppercase mb-2">{filterType === 'passengers' ? 'Pasajero (Apellido)' : 'Proveedor'}</label>
          <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)} className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10 outline-none">
            {uniqueEntities.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div><label className="block text-xs text-dark-300 uppercase mb-2">Desde</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10" style={{ colorScheme: 'dark' }} /></div>
        <div><label className="block text-xs text-dark-300 uppercase mb-2">Hasta</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10" style={{ colorScheme: 'dark' }} /></div>
      </div>

      <div className="card-glass rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse uppercase">
            <thead className="bg-white/5 text-dark-300 text-xs font-bold tracking-widest">
              <tr>
                <th className="p-4 border-b border-white/10">Fecha</th>
                <th className="p-4 border-b border-white/10">Apellido / Nombre</th>
                <th className="p-4 border-b border-white/10">Vendedor</th>
                <th className="p-4 border-b border-white/10 text-right">Monto</th>
                <th className="p-4 border-b border-white/10 text-right">Pagado</th>
                <th className="p-4 border-b border-white/10 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="text-dark-100 divide-y divide-white/5">
              {displayedItems.map((sale) => {
                const info = getVentaInfo(sale);
                return (
                  <tr key={sale._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm font-mono">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-white">{info.apellido}, <span className="text-[14px] font-normal">{info.nombre}</span></td>
                    <td className="p-4 text-sm font-semibold text-primary-300">{info.vendedor}</td>
                    <td className="p-4 text-right font-mono"><span className={getCurrencyStyle(sale.saleCurrency)}>{sale.saleCurrency}</span> {sale.totalSalePrice?.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono text-white"><span className={getCurrencyStyle(sale.saleCurrency)}>{sale.saleCurrency}</span> {sale.totalClientPayments?.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold" style={{ color: sale.clientBalance < 0 ? '#f87171' : '#22c55e' }}>
                      {sale.clientBalance?.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-dark-800/80 p-6 border-t border-white/20">
          <div className="flex gap-6">
            {Object.keys(totals).map(currency => (
              <div key={currency} className="p-4 rounded-lg bg-dark-900/50 border border-white/10 min-w-[240px]">
                <p className={`${getCurrencyStyle(currency)} text-2xl border-b border-white/10 mb-2`}>{currency}</p>
                <div className="flex justify-between font-bold text-xl mt-2 text-white">
                  <span>Saldo:</span> 
                  <span style={{ color: totals[currency].balance < 0 ? '#f87171' : '#22c55e' }}>
                    {totals[currency].balance.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedEntity !== 'Todos' && (
        <div className="card-glass rounded-xl border border-primary-500/30 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 bg-dark-900/50 border-b border-white/10 flex justify-between items-center">
            <h4 className="text-sm font-bold text-primary-400 tracking-widest font-mono ">
              Pagos asociados a las ventas de: {selectedEntity}
            </h4>
          </div>
          <div className="p-6">
            {loadingPayments ? (
              <p className="text-xs text-dark-400 animate-pulse uppercase">Consultando base de datos...</p>
            ) : salePayments.length > 0 ? (
              <table className="w-full text-xs text-left border-collapse font-mono uppercase">
                <thead className="text-dark-400 border-b border-white/10">
                  <tr>
                    <th className="py-3">Fecha</th>
                    <th className="py-3">Método</th>
                    <th className="py-3">Tipo</th>
                    <th className="py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {salePayments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3">{new Date(p.date || p.paymentDate).toLocaleDateString()}</td>
                      <td className="py-3 text-dark-300">{p.method || p.paymentMethod || 'S/D'}</td>
                      <td className="py-3 text-dark-300">{p.type === 'passenger' ? 'PASAJERO' : p.type === 'provider' ? 'PROVEEDOR' : (p.type || 'S/D')}</td>
                      <td className="py-3 text-right font-bold" style={{ color: '#22c55e' }}>
                        {p.currency} {p.amount?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-dark-400 font-mono ">No hay payments registrados para esta selección.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Balances;