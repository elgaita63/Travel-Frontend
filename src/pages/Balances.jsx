import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';

const Balances = () => {
  const [filterType, setFilterType] = useState('passengers');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [allSales, setAllSales] = useState([]);
  const [allSystemPayments, setAllSystemPayments] = useState([]); // Nueva bolsa para pagos
  const [usersMap, setUsersMap] = useState({}); 
  const [selectedEntity, setSelectedEntity] = useState('Todos');
  const [loading, setLoading] = useState(false);

  // 1. Carga de Ventas y Usuarios (TU LÓGICA INTACTA)
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

  // 2. CARGA DE PAGOS (INDEPENDIENTE PARA NO ROMPER LO ANTERIOR)
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const paymentsRes = await api.get(`/api/client-payments?limit=5000`);
        if (paymentsRes.data.success) {
          setAllSystemPayments(paymentsRes.data.data.payments || []);
        }
      } catch (error) {
        console.error("Error cargando pagos:", error);
      }
    };
    fetchPayments();
  }, []);

  const getVentaInfo = (sale) => {
    const p = sale.passengers && sale.passengers[0] ? sale.passengers[0] : null;
    const pInfo = p?.passengerId || p;
    const vendedorId = typeof sale.createdBy === 'object' ? sale.createdBy?._id : sale.createdBy;
    const vendedorNombre = usersMap[vendedorId] || "Sistema";

    return {
      apellido: (pInfo?.surname || 'S/D').toUpperCase(),
      nombre: pInfo?.name || 'S/D',
      vendedor: vendedorNombre
    };
  };

  const uniqueEntities = useMemo(() => {
    const names = allSales.map(sale => getVentaInfo(sale).apellido);
    return ['Todos', ...new Set(names)].sort();
  }, [allSales, usersMap]);

  const displayedItems = useMemo(() => {
    if (selectedEntity === 'Todos') return allSales;
    return allSales.filter(sale => getVentaInfo(sale).apellido === selectedEntity);
  }, [selectedEntity, allSales, usersMap]);

  const detailedPayments = useMemo(() => {
    if (selectedEntity === 'Todos') return [];
    const listado = [];
    displayedItems.forEach(sale => {
      const pagos = sale.payments || []; 
      pagos.forEach(p => {
        listado.push({
          date: p.date,
          amount: p.amount,
          method: p.method || 'S/D',
          note: p.note || '',
          currency: sale.saleCurrency
        });
      });
    });
    return listado.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedEntity, displayedItems]);

  const totals = useMemo(() => {
    return displayedItems.reduce((acc, sale) => {
      const curr = sale.saleCurrency || 'USD';
      if (!acc[curr]) acc[curr] = { balance: 0 };
      acc[curr].balance += sale.clientBalance || 0;
      return acc;
    }, {});
  }, [displayedItems]);

  const getCurrencyStyle = (curr) => {
    if (curr === 'ARS') return 'text-sky-400 font-bold'; 
    if (curr === 'USD') return 'text-green-800 font-bold'; 
    return 'text-white';
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white mb-6 gradient-text tracking-tighter ">Saldos/Balances/Conciliaciones de Pasajeros/Proveedores</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 card-glass rounded-xl border border-white/10 shadow-2xl">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-dark-300 uppercase mb-2 tracking-widest">Pasajero (Apellido)</label>
          <select 
            value={selectedEntity} 
            onChange={(e) => setSelectedEntity(e.target.value)} 
            className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10 outline-none focus:ring-2 focus:ring-primary-500"
          >
            {uniqueEntities.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-dark-300 uppercase mb-2">Desde</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10 shadow-sm" style={{ colorScheme: 'dark' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-dark-300 uppercase mb-2">Hasta</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10 shadow-sm" style={{ colorScheme: 'dark' }} />
        </div>
      </div>

      <div className="card-glass rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 text-dark-300 uppercase text-xs font-bold tracking-widest">
              <tr>
                <th className="p-4 border-b border-white/10 text-primary-400">saleID</th>
                <th className="p-4 border-b border-white/10">Fecha</th>
                <th className="p-4 border-b border-white/10">Apellido / Nombre</th>
                <th className="p-4 border-b border-white/10">Vendedor</th>
                <th className="p-4 border-b border-white/10 text-right">Monto</th>
                <th className="p-4 border-b border-white/10 text-right">Pagado</th>
                <th className="p-4 border-b border-white/10 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="text-dark-100 divide-y divide-white/5 uppercase">
              {displayedItems.map((sale) => {
                const info = getVentaInfo(sale);
                return (
                  <tr key={sale._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-[9px] font-mono text-primary-300 ">{(sale._id).toUpperCase()}</td>
                    <td className="p-4 text-sm font-mono">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 uppercase font-bold text-white">
                      {info.apellido}, <span className="text-[14px] font-normal uppercase">{info.nombre}</span>
                    </td>
                    <td className="p-4 text-sm font-semibold uppercase text-primary-300">{info.vendedor}</td>
                    <td className="p-4 text-right font-mono"><span className={getCurrencyStyle(sale.saleCurrency)}>{sale.saleCurrency}</span> {sale.totalSalePrice?.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono text-success-400"><span className={getCurrencyStyle(sale.saleCurrency)}>{sale.saleCurrency}</span> {sale.totalClientPayments?.toLocaleString()}</td>
                    <td className={`p-4 text-right font-mono font-bold ${sale.clientBalance > 0 ? 'text-error-400' : 'text-success-500'}`}>
                      <span className={getCurrencyStyle(sale.saleCurrency)}>{sale.clientBalance?.toLocaleString()}</span>
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
                <div className="flex justify-between font-bold text-xl mt-2 text-white ">
                  <span>SALDO:</span> <span className={totals[currency].balance > 0 ? 'text-error-400' : 'text-success-500'}>{totals[currency].balance.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-bold text-white mb-4 tracking-tighter border-l-4 border-sky-400 pl-3 ">Listado General de Pagos: </h2>
        <div className="card-glass rounded-xl border border-white/10 overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-primary-900/20 text-dark-300 uppercase font-black tracking-widest">
              <tr>
                <th className="p-3">saleID</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="text-dark-200 divide-y divide-white/5 uppercase font-mono">
              {allSystemPayments.length > 0 ? (
                allSystemPayments.map((p, idx) => {
                  const pSaleId = typeof p.saleId === 'object' ? p.saleId?._id : p.saleId;
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-all">
                      <td className="p-3 text-primary-300 ">{(pSaleId || 'S/ID').toUpperCase()}</td>
                      <td className="p-3">{p.method || p.paymentMethod || 'S/D'}</td>
                      <td className="p-3 text-right font-bold text-success-400 ">{p.amount?.toLocaleString()}</td>
                      <td className={`p-3 font-bold ${getCurrencyStyle(p.currency || 'USD')}`}>{p.currency || 'USD'}</td>
                      <td className="p-3">{new Date(p.date || p.paymentDate).toLocaleDateString()}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="5" className="p-10 text-center text-dark-400 ">No hay pagos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Balances;