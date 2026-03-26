import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';

const Balances = () => {
  const [filterType, setFilterType] = useState('passengers'); // 'passengers' o 'providers'
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

  const getVentaInfo = (sale) => {
    const p = sale.passengers && sale.passengers[0] ? sale.passengers[0] : null;
    const pInfo = p?.passengerId || p;
    const vendedorId = typeof sale.createdBy === 'object' ? sale.createdBy?._id : sale.createdBy;
    const vendedorNombre = usersMap[vendedorId] || "Sistema";

    const proveedoresDeVenta = (sale.services || []).map(s => 
      (s.providerName || s.providerId?.name || 'S/D').toUpperCase()
    );

    return {
      apellido: (pInfo?.surname || 'S/D').toUpperCase(),
      nombre: pInfo?.name || 'S/D',
      vendedor: vendedorNombre,
      proveedores: proveedoresDeVenta
    };
  };

  const uniqueEntities = useMemo(() => {
    let listado = [];
    if (filterType === 'passengers') {
      listado = allSales.map(sale => getVentaInfo(sale).apellido);
    } else {
      allSales.forEach(sale => {
        listado = [...listado, ...getVentaInfo(sale).proveedores];
      });
    }
    return ['Todos', ...new Set(listado)].sort();
  }, [allSales, usersMap, filterType]);

  const displayedItems = useMemo(() => {
    if (selectedEntity === 'Todos') return allSales;
    
    if (filterType === 'passengers') {
      return allSales.filter(sale => getVentaInfo(sale).apellido === selectedEntity);
    } else {
      return allSales.filter(sale => getVentaInfo(sale).proveedores.includes(selectedEntity));
    }
  }, [selectedEntity, allSales, usersMap, filterType]);

  const totals = useMemo(() => {
    return displayedItems.reduce((acc, sale) => {
      const curr = sale.saleCurrency || 'USD';
      if (!acc[curr]) acc[curr] = { balance: 0 };
      acc[curr].balance += sale.clientBalance || 0;
      return acc;
    }, {});
  }, [displayedItems]);

  // Esta función ahora solo devuelve el color de la MONEDA, pero no pisa el del monto si es saldo
  const getCurrencyTagStyle = (curr) => {
    if (curr === 'ARS') return 'text-sky-400 font-bold'; 
    if (curr === 'USD') return 'text-green-800 font-bold'; 
    return 'text-white';
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white mb-6 gradient-text tracking-tighter ">Saldos/Balances/Conciliaciones de Pasajeros/Proveedores</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6 card-glass rounded-xl border border-white/10 shadow-2xl">
        <div>
          <label className="block text-xs font-semibold text-dark-300 uppercase mb-2 tracking-widest">Ver por</label>
          <select 
            value={filterType} 
            onChange={(e) => {
              setFilterType(e.target.value);
              setSelectedEntity('Todos');
            }} 
            className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10 outline-none"
          >
            <option value="passengers">Pasajeros</option>
            <option value="providers">Proveedores</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-dark-300 uppercase mb-2 tracking-widest">
            {filterType === 'passengers' ? 'Pasajero (Apellido)' : 'Proveedor'}
          </label>
          <select 
            value={selectedEntity} 
            onChange={(e) => setSelectedEntity(e.target.value)} 
            className="w-full bg-dark-800 text-white rounded-lg p-2.5 border border-white/10 outline-none"
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
                    <td className="p-4 text-sm font-mono">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 uppercase font-bold text-white">
                      {info.apellido}, <span className="text-[14px] font-normal uppercase">{info.nombre}</span>
                    </td>
                    <td className="p-4 text-sm font-semibold uppercase text-primary-300">{info.vendedor}</td>
                    <td className="p-4 text-right font-mono">
                      <span className={getCurrencyTagStyle(sale.saleCurrency)}>{sale.saleCurrency}</span> {sale.totalSalePrice?.toLocaleString()}
                    </td>
                    {/* Pagado: Texto en blanco */}
                    <td className="p-4 text-right font-mono text-white">
                      <span className={getCurrencyTagStyle(sale.saleCurrency)}>{sale.saleCurrency}</span> {sale.totalClientPayments?.toLocaleString()}
                    </td>
                    {/* Saldo: ROJO si es negativo (<0), VERDE si es positivo (>0) */}
                    <td className={`p-4 text-right font-mono font-bold ${sale.clientBalance < 0 ? 'text-error-400' : 'text-success-500'}`}>
                      <span className={getCurrencyTagStyle(sale.saleCurrency)}>{sale.saleCurrency}</span> {sale.clientBalance?.toLocaleString()}
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
                <p className={`${getCurrencyTagStyle(currency)} text-2xl border-b border-white/10 mb-2`}>{currency}</p>
                <div className="flex justify-between font-bold text-xl mt-2 text-white ">
                  <span>Saldo:</span> 
                  <span className={totals[currency].balance < 0 ? 'text-error-400' : 'text-success-500'}>
                    {totals[currency].balance.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Balances;