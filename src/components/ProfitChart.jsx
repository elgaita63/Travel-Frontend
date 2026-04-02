import React from 'react';
import CurrencyDisplay from './CurrencyDisplay';
import { formatCurrencyCompact, formatWithWarning, formatCurrencyFull, getCurrencySymbol } from '../utils/formatNumbers';

const ProfitChart = ({ sale }) => {
  // Calculate chart data dynamically
  const totalSalePrice = sale.totalSalePrice || 0;
  
  const totalCost = sale.services?.reduce((total, service) => {
    const costProvider = service.costProvider !== null && service.costProvider !== undefined 
      ? service.costProvider 
      : (service.priceClient || 0);
    return total + (parseFloat(costProvider) || 0);
  }, 0) || 0;
  
  const profit = totalSalePrice - totalCost;
  const totalClientPayments = sale.totalClientPayments || 0;
  const totalProviderPayments = sale.totalProviderPayments || 0;
  
  // Extraer datos del vendedor y calcular comisión
  const sellerComisionPct = sale.createdBy?.comision || 0;
  const sellerComisionAmount = profit > 0 ? profit * (sellerComisionPct / 100) : 0;
  const sellerBalance = 0; // Fijo en 0 por ahora

  // Extraer status de la venta para el badge
  const saleStatus = sale.status || 'unknown';

  // Helper para el color y texto del badge
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'open': return { color: 'bg-yellow-500 text-yellow-900', icon: '🔓', text: 'ABIERTA' };
      case 'closed': return { color: 'bg-green-500 text-green-900', icon: '🔒', text: 'CERRADA' };
      case 'cancelled': return { color: 'bg-red-500 text-white', icon: '❌', text: 'CANCELADA' };
      default: return { color: 'bg-gray-500 text-white', icon: '❓', text: 'DESCONOCIDO' };
    }
  };
  const statusDisplay = getStatusDisplay(saleStatus);

  // Calculate percentages for the chart
  const maxValue = Math.max(totalSalePrice, totalCost, totalClientPayments, totalProviderPayments);
  const salePricePercent = maxValue > 0 ? (totalSalePrice / maxValue) * 100 : 0;
  const costPercent = maxValue > 0 ? (totalCost / maxValue) * 100 : 0;
  const clientPaymentsPercent = maxValue > 0 ? (totalClientPayments / maxValue) * 100 : 0;
  const providerPaymentsPercent = maxValue > 0 ? (totalProviderPayments / maxValue) * 100 : 0;

  // Format values with warnings for suspiciously large numbers (using full number format)
  const formattedSalePrice = { value: formatCurrencyFull(totalSalePrice, sale.saleCurrency), warning: false };
  const formattedCost = { value: formatCurrencyFull(totalCost, sale.saleCurrency), warning: false };
  const formattedClientPayments = { value: formatCurrencyFull(totalClientPayments, sale.saleCurrency), warning: false };
  const formattedProviderPayments = { value: formatCurrencyFull(totalProviderPayments, sale.saleCurrency), warning: false };
  const formattedProfit = { value: formatCurrencyFull(profit, sale.saleCurrency), warning: false };
  const formattedComision = { value: formatCurrencyFull(sellerComisionAmount, sale.saleCurrency), warning: false };
  const formattedSellerBalance = { value: formatCurrencyFull(sellerBalance, sale.saleCurrency), warning: false };

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-dark-100">Estado Financiero</h2>
      </div>
      
      {/* Chart Visualization */}
      <div className="space-y-4">
        {/* Sale Price Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-dark-200">Precio Total Venta</span>
            <span 
              className={`text-sm font-bold ${formattedSalePrice.warning ? 'text-red-500' : 'text-blue-500'}`}
              style={{ color: formattedSalePrice.warning ? '#ef4444' : '#3b82f6' }}
            >
              <CurrencyDisplay>{formattedSalePrice.value}</CurrencyDisplay>
              {formattedSalePrice.warning && <span className="text-xs text-red-400 ml-1">⚠️</span>}
            </span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3">
            <div 
              className="bg-primary-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${salePricePercent}%` }}
            ></div>
          </div>
        </div>

        {/* Cost Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-dark-200">Costo Total</span>
            <span 
              className={`text-sm font-bold ${formattedCost.warning ? 'text-red-500' : 'text-red-500'}`}
              style={{ color: '#ef4444' }}
            >
              <CurrencyDisplay>{formattedCost.value}</CurrencyDisplay>
              {formattedCost.warning && <span className="text-xs text-red-400 ml-1">⚠️</span>}
            </span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3">
            <div 
              className="bg-error-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${costPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Client Payments Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-dark-200">Pagos de Pasajero</span>
            <span 
              className={`text-sm font-bold ${formattedClientPayments.warning ? 'text-red-500' : 'text-green-500'}`}
              style={{ color: formattedClientPayments.warning ? '#ef4444' : '#22c55e' }}
            >
              <CurrencyDisplay>{formattedClientPayments.value}</CurrencyDisplay>
              {formattedClientPayments.warning && <span className="text-xs text-red-400 ml-1">⚠️</span>}
            </span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3">
            <div 
              className="bg-success-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${clientPaymentsPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Provider Payments Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-dark-200">Pagos a Proveedor</span>
            <span 
              className={`text-sm font-bold ${formattedProviderPayments.warning ? 'text-red-500' : 'text-orange-500'}`}
              style={{ color: formattedProviderPayments.warning ? '#ef4444' : '#f97316' }}
            >
              <CurrencyDisplay>{formattedProviderPayments.value}</CurrencyDisplay>
              {formattedProviderPayments.warning && <span className="text-xs text-red-400 ml-1">⚠️</span>}
            </span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3">
            <div 
              className="bg-warning-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${providerPaymentsPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Profit Summary */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium text-dark-200">Ganancia Neta</span>
          <span className={`text-2xl font-bold ${
            profit >= 0 ? 'text-success-400' : 'text-error-400'
          } ${formattedProfit.warning ? 'text-red-500' : ''}`}>
            <CurrencyDisplay>{formattedProfit.value}</CurrencyDisplay>
            {formattedProfit.warning && <span className="text-xs text-red-400 ml-1">⚠️</span>}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-dark-400">Margen de Ganancia</span>
          <span className={`text-sm font-semibold ${
            profit >= 0 ? 'text-success-400' : 'text-error-400'
          }`}>
            {totalSalePrice > 0 ? ((profit / totalSalePrice) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>

      {/* Balance Summary con el Badge de Estado abajo */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-dark-800/50 p-3 rounded-lg border border-white/5">
            <div className="text-xs font-bold text-white mb-1 uppercase tracking-tight">Saldo Pasajero</div>
            <div className={`text-2xl font-black ${(() => {
              const balance = totalSalePrice - totalClientPayments;
              return balance <= 0 ? 'text-success-400' : 'text-error-400';
            })()}`}>
              <CurrencyDisplay>{formatCurrencyFull(totalSalePrice - totalClientPayments, sale.saleCurrency)}</CurrencyDisplay>
            </div>
          </div>
          <div className="bg-dark-800/50 p-3 rounded-lg border border-white/5">
            <div className="text-xs font-bold text-white mb-1 uppercase tracking-tight">Saldo Proveedor</div>
            <div className={`text-2xl font-black ${(() => {
              const balance = totalCost - totalProviderPayments;
              return balance >= 0 ? 'text-success-400' : 'text-error-400';
            })()}`}>
              <CurrencyDisplay>{formatCurrencyFull(totalCost - totalProviderPayments, sale.saleCurrency)}</CurrencyDisplay>
            </div>
          </div>
        </div>

        {/* Badge debajo de los saldos */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-2 bg-dark-900/40 px-4 py-2 rounded-full border border-white/5">
             <span className="text-xs font-bold text-dark-400 uppercase tracking-widest">Estado:</span>
             <span className={`inline-flex items-center px-3 py-1 text-xs font-black rounded-full shadow-sm tracking-widest ${statusDisplay.color}`}>
               <span className="mr-1">{statusDisplay.icon}</span>
               {statusDisplay.text}
             </span>
          </div>
        </div>
      </div>

      {/* NUEVA SECCIÓN: Comisión del Vendedor */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-accent-500/10 p-3 rounded-lg border border-accent-500/20">
            <div className="text-xs font-bold text-accent-400 mb-1 uppercase tracking-tight">
              Comisión Vendedor ({sellerComisionPct}%)
            </div>
            <div className="text-xl font-black text-white">
              <CurrencyDisplay>{formattedComision.value}</CurrencyDisplay>
            </div>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
            <div className="text-xs font-bold text-blue-400 mb-1 uppercase tracking-tight">
              Balance Vendedor
            </div>
            <div className="text-xl font-black text-white">
              <CurrencyDisplay>{formattedSellerBalance.value}</CurrencyDisplay>
            </div>
          </div>
        </div>
      </div>

      {/* Referencia */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="text-sm font-bold text-dark-300 mb-3 uppercase tracking-widest">Referencia:</div>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-dark-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-sm mr-2 shadow-sm"></div>
            <span>Precio Venta</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-sm mr-2 shadow-sm"></div>
            <span>Costo</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-sm mr-2 shadow-sm"></div>
            <span>Pagos Pasajero</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-sm mr-2 shadow-sm"></div>
            <span>Pagos Proveedor</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitChart;