import React, { useState, useEffect } from 'react';
import { formatCurrency, formatCurrencyCompact } from '../utils/formatNumbers';
import CurrencyDisplay from './CurrencyDisplay';
import api from '../utils/api';

const ComprehensiveSalesOverview = ({ sales, onSaleClick, loading = false, selectedCurrency = 'ARS' }) => {
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('detailed'); 
  const [selectedPeriod, setSelectedPeriod] = useState('all'); 

  const summaryStats = React.useMemo(() => {
    if (!sales || sales.length === 0) {
      return {
        totalSales: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0,
        averageProfitMargin: 0, topPerformingSale: null, worstPerformingSale: null
      };
    }

    const currencyFilteredSales = sales.filter(sale => sale.saleCurrency === selectedCurrency);

    const stats = currencyFilteredSales.reduce((acc, sale) => {
      acc.totalSales += 1;
      acc.totalRevenue += sale.totalSalePrice || 0;
      acc.totalCost += sale.totalCost || 0;
      acc.totalProfit += sale.profit || 0;
      return acc;
    }, { totalSales: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 });

    stats.averageProfitMargin = stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) * 100 : 0;
    const sortedByProfit = [...currencyFilteredSales].sort((a, b) => (b.profit || 0) - (a.profit || 0));
    stats.topPerformingSale = sortedByProfit[0];
    stats.worstPerformingSale = sortedByProfit[sortedByProfit.length - 1];

    return stats;
  }, [sales, selectedCurrency]);

  const filteredSales = React.useMemo(() => {
    if (!sales) return [];
    let filtered = sales.filter(sale => sale.saleCurrency === selectedCurrency);
    
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      switch (selectedPeriod) {
        case 'today': filterDate.setHours(0, 0, 0, 0); break;
        case 'week': filterDate.setDate(now.getDate() - 7); break;
        case 'month': filterDate.setMonth(now.getMonth() - 1); break;
        case 'quarter': filterDate.setMonth(now.getMonth() - 3); break;
        case 'year': filterDate.setFullYear(now.getFullYear() - 1); break;
      }
      filtered = filtered.filter(sale => new Date(sale.createdAt) >= filterDate);
    }
    return filtered;
  }, [sales, selectedPeriod, selectedCurrency]);

  const sortedSales = React.useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'totalSalePrice': aValue = a.totalSalePrice || 0; bValue = b.totalSalePrice || 0; break;
        case 'totalCost': aValue = a.totalCost || 0; bValue = b.totalCost || 0; break;
        case 'profit': aValue = a.profit || 0; bValue = b.profit || 0; break;
        case 'createdAt': aValue = new Date(a.createdAt); bValue = new Date(b.createdAt); break;
        default: aValue = a[sortBy] || 0; bValue = b[sortBy] || 0;
      }
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });
  }, [filteredSales, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } 
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getAmountColor = (amount) => {
    return amount < 0 ? 'text-red-400' : 'text-green-400';
  };

  const BalanceCell = ({ amount, currency }) => {
    const symbolColor = currency === 'USD' ? 'text-green-300' : 'text-cyan-400'; 
    const symbol = currency === 'USD' ? 'U$D' : 'AR$';
    const amountColor = getAmountColor(amount);

    return (
      <div className={`text-right text-sm font-medium ${amountColor}`}>
        <span className={`${symbolColor} mr-1`}>{symbol}</span>
        {Math.abs(amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        {amount < 0 && <span className="ml-0.5">-</span>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary-200 border-t-primary-500"></div>
        <p className="text-dark-300 text-lg font-medium ml-4">Loading sales data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <p className="text-sm font-medium text-dark-300">Total Profit</p>
          <p className={`text-2xl font-semibold ${getAmountColor(summaryStats.totalProfit)}`}>
            <CurrencyDisplay>{formatCurrency(summaryStats.totalProfit, selectedCurrency)}</CurrencyDisplay>
          </p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-dark-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>Fecha {getSortIcon('createdAt')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">Pasajero</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">Vendedor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-dark-300 uppercase tracking-wider">Precio</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-dark-300 uppercase tracking-wider">Costo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-dark-300 uppercase tracking-wider">Ganancia</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-dark-300 uppercase tracking-wider">Margen</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-dark-300 uppercase tracking-wider">Saldo-Pas</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-dark-300 uppercase tracking-wider">Saldo-Prov</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-dark-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedSales.map((sale) => {
                const profitMargin = sale.totalSalePrice > 0 ? (sale.profit / sale.totalSalePrice) * 100 : 0;
                
                // Nombre del vendedor en MAYÚSCULAS
                const sellerName = (sale.createdBy?.fullName || sale.createdBy?.username || 'SISTEMA').toUpperCase();
                
                return (
                  <tr key={sale.id || sale._id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onSaleClick && onSaleClick(sale)}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-dark-100">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-dark-100">
                      {sale.clientId?.name} {sale.clientId?.surname}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-dark-300">
                      {sellerName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-dark-100">
                      <CurrencyDisplay>{formatCurrency(sale.totalSalePrice, selectedCurrency)}</CurrencyDisplay>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-dark-100">
                      <CurrencyDisplay>{formatCurrency(sale.totalCost, selectedCurrency)}</CurrencyDisplay>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-medium ${getAmountColor(sale.profit)}`}>
                        <CurrencyDisplay>{formatCurrency(sale.profit, selectedCurrency)}</CurrencyDisplay>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-dark-100">
                      {profitMargin.toFixed(1)}%
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <BalanceCell amount={sale.clientBalance || 0} currency={selectedCurrency} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <BalanceCell amount={sale.providerBalance || 0} currency={selectedCurrency} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button className="text-primary-400 hover:text-primary-300 text-sm font-medium">Ver Detalles</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveSalesOverview;