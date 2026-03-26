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

  // 1. Carga de Ventas y Usuarios
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

  // Función para extraer info de la venta (Basado en tu Compass)
  const getVentaInfo = (sale) => {
    // Apellido del pasajero: sale.passengers[0].passengerId.surname o sale.passengers[0].surname
    const p = sale.passengers && sale.passengers[0] ? sale.passengers[0] : null;
    const pInfo = p?.passengerId || p;
    
    // Vendedor: Buscamos el ID de createdBy en el mapa de usuarios
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

  // Listado de Pagos asociados a la selección (Viene del registro de la venta)
  const detailedPayments = useMemo(() => {
    if (selectedEntity === 'Todos') return [];
    const listado = [];
    displayedItems.forEach(sale => {
      const pagos = sale.payments || []; // Campo 'payments' del Compass
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
    if (curr === 'ARS') return 'text-sky-400 font-bold'; // Celeste
    if (curr === 'USD') return 'text-green-800 font-bold'; // Verde Oscuro
    return 'text-white';
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white mb-6 gradient-text tracking-tighter">Saldos/Balances/Conciliaciones de Pasajeros/Proveedores</h1>

      {/* FILTROS */}
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
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10 shadow-sm"
            style={{ colorScheme: 'dark' }} 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-dark-300 uppercase mb-2">Hasta</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10 shadow-sm"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="card-glass rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 text-dark-300 uppercase text-xs font-bold tracking-widest">
              <tr>
                <th className="p-4 border-b border-white/10">Fecha</th>
                <th className="p-4 border-b border-white/10">Apellido / Nombre</th>
                <th className="p-4 border-b border-white/10 text-primary-400">Vendedor</th>
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
                    <td className="p-4 uppercase">
                      <span className="font-bold text-white">{info.apellido}</span>, <span className="text-[14px] text-dark-400 uppercase font-normal">{info.nombre}</span>
                    </td>
                    <td className="p-4 text-sm font-semibold uppercase text-primary-300">{info.vendedor}</td>
                    <td className="p-4 text-right font-mono">
                       <span className={getCurrencyStyle(sale.saleCurrency)}>{sale.saleCurrency}</span> {sale.totalSalePrice?.toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono text-success-400">
                      <span className={getCurrencyStyle(sale.saleCurrency)}>{sale.saleCurrency}</span> {sale.totalClientPayments?.toLocaleString()}
                    </td>
                    <td className={`p-4 text-right font-mono font-bold ${sale.clientBalance > 0 ? 'text-error-400' : 'text-success-500'}`}>
                      <span className={getCurrencyStyle(sale.saleCurrency)}>{sale.clientBalance?.toLocaleString()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* CIERRE DE POSICIÓN */}
        <div className="bg-dark-800/80 p-6 border-t border-white/20">
          <div className="flex flex-wrap gap-6">
            {Object.keys(totals).map(currency => (
              <div key={currency} className="p-4 rounded-lg bg-dark-900/50 border border-white/10 min-w-[240px]">
                <p className={`${getCurrencyStyle(currency)} text-2xl border-b border-white/10 mb-2 pb-1`}>{currency}</p>
                <div className="flex justify-between font-bold text-xl mt-2">
                  <span className="text-white">SALDO:</span> 
                  <span className={totals[currency].balance > 0 ? 'text-error-400' : 'text-success-500'}>
                    {totals[currency].balance.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DETALLE DE PAGOS (SOLO SELECCIONADOS) */}
      {selectedEntity !== 'Todos' && (
        <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-bold text-white mb-4 tracking-tighter border-l-4 border-primary-500 pl-3 text-sky-400 font-poppins">Desglose de Cobros : </h2>
          <div className="card-glass rounded-xl border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-primary-900/20 text-dark-300 uppercase text-[10px] font-black italic tracking-widest">
                <tr>
                  <th className="p-3">Fecha Pago</th>
                  <th className="p-3">Medio / Nota</th>
                  <th className="p-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="text-dark-200 text-sm divide-y divide-white/5">
                {detailedPayments.length > 0 ? (
                  detailedPayments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-all">
                      <td className="p-3 font-mono">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="p-3 uppercase">
                        {p.method} <span className="text-dark-400 text-[10px] ml-2 font-normal lowercase tracking-normal">({p.note || 'S/D'})</span>
                      </td>
                      <td className="p-3 text-right font-bold text-success-400 font-mono">
                        <span className={getCurrencyStyle(p.currency)}>{p.currency}</span> {p.amount?.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" className="p-10 text-center text-dark-400 italic font-mono">No se registran pagos para este pasajero.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Balances;