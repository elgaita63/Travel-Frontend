import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatNumbers';
import CurrencyDisplay from './CurrencyDisplay';
import api from '../utils/api';
import { buildNombreVentaSuggestion } from '../utils/buildNombreVentaSuggestion';
import { createReportPDF, downloadPDF } from '../utils/pdfUtils';

const truncateExport = (s, max = 80) => {
  const t = s == null ? '' : String(s);
  return t.length <= max ? t : `${t.slice(0, max - 3)}...`;
};

function downloadCsvSemicolon(filename, headers, rows) {
  const sep = ';';
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[;\r\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(esc).join(sep), ...rows.map((row) => headers.map((h) => esc(row[h])).join(sep))];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Texto bajo "Destino" en la grilla: nombreVenta si existe; si no, misma composición que el wizard (paso 7). */
function getComprehensiveSaleDestinationLabel(sale) {
  const nombre = sale.nombreVenta && String(sale.nombreVenta).trim();
  if (nombre) return nombre.toUpperCase();

  const destForName = {
    city: sale.destination?.city || '',
    country: sale.destination?.country || ''
  };
  const instancesForName = (sale.services || []).map((s) => {
    const sid = s.serviceId && typeof s.serviceId === 'object' ? s.serviceId : null;
    const notes = (s.notes || '').replace(/^Service:\s*[^-]+-\s*/i, '').trim();
    return {
      serviceName: s.serviceName || sid?.name || '',
      templateName: s.serviceTypeName || '',
      serviceInfo: notes || sid?.destino || s.serviceName || '',
      destination: {
        city: destForName.city || sid?.location?.city || ''
      }
    };
  });
  return buildNombreVentaSuggestion(destForName, instancesForName).toUpperCase();
}

const ComprehensiveSalesOverview = ({
  sales,
  onSaleClick,
  loading = false,
  selectedCurrency = 'ARS',
  totalSales = 0,
  currentPage = 1,
  totalPages = 1,
  rowsPerPage = 200,
  onPageChange,
  onRowsPerPageChange
}) => {
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [allUsers, setAllUsers] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [exportBusy, setExportBusy] = useState(false); 

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

  const filteredSales = React.useMemo(() => {
    if (!sales) return [];
    let result = sales.filter(sale => sale.saleCurrency === selectedCurrency);
    return result;
  }, [sales, selectedCurrency]);

  const sortedSales = React.useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      let aV, bV;
      switch (sortBy) {
        case 'createdAt': aV = new Date(a.createdAt); bV = new Date(b.createdAt); break;
        case 'passenger': aV = (a.clientId?.name + a.clientId?.surname).toLowerCase(); bV = (b.clientId?.name + b.clientId?.surname).toLowerCase(); break;
        case 'seller': aV = (a.createdBy?.fullName || '').toLowerCase(); bV = (a.createdBy?.fullName || '').toLowerCase(); break;
        default: aV = a[sortBy] || 0; bV = b[sortBy] || 0;
      }
      return sortOrder === 'asc' ? (aV > bV ? 1 : -1) : (aV < bV ? 1 : -1);
    });
  }, [filteredSales, sortBy, sortOrder]);

  const totals = React.useMemo(() => {
    let sumVendedores = 0;
    let sumPasajero = 0;
    let sumProveedor = 0;
    let sumPrecio = 0;
    let sumCosto = 0;
    let sumGanancia = 0;
    filteredSales.forEach((s) => {
      const vBalance = s.sellerBalance
        ? (selectedCurrency === 'ARS' ? (s.sellerBalance.ars || 0) : (s.sellerBalance.usd || 0))
        : 0;
      sumVendedores += vBalance;
      sumPasajero += s.clientBalance || 0;
      sumProveedor += s.providerBalance || 0;
      sumPrecio += Number(s.totalSalePrice) || 0;
      sumCosto += Number(s.totalCost) || 0;
      sumGanancia += Number(s.profit) || 0;
    });
    const marginTotalPct = sumPrecio > 0 ? (sumGanancia / sumPrecio) * 100 : 0;
    return { sumVendedores, sumPasajero, sumProveedor, sumPrecio, sumCosto, sumGanancia, marginTotalPct };
  }, [filteredSales, selectedCurrency]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const getSortIcon = (field) => (sortBy !== field ? '↕️' : sortOrder === 'asc' ? '↑' : '↓');
  const getAmountColor = (amount) => (amount < 0 ? 'text-red-400' : 'text-green-400');

  const BalanceCell = ({ amount, currency, className = "" }) => {
    const symbol = currency === 'USD' ? 'U$D' : 'AR$';
    const symbolColor = currency === 'USD' ? 'text-green-300' : 'text-cyan-400';
    const negative = amount < 0;
    const abs = Math.abs(amount);
    return (
      <div className={`text-right font-medium ${getAmountColor(amount)} ${className}`}>
        {negative ? <span className="mr-0.5">−</span> : null}
        <span className={`${symbolColor} mr-1`}>{symbol}</span>
        {abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    );
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-500 text-yellow-900';
      case 'closed': return 'bg-green-500 text-green-900';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return '🔓';
      case 'closed': return '🔒';
      case 'cancelled': return '❌';
      default: return '📄';
    }
  };

  const exportHeaders = React.useMemo(
    () => [
      'Fecha',
      'Pasajero',
      'Destino',
      'Proveedores',
      'Vendedor',
      'Pendiente vendedor',
      'Estado',
      'Comisión',
      '% Comisión',
      `Precio (${selectedCurrency})`,
      `Costo (${selectedCurrency})`,
      `Ganancia (${selectedCurrency})`,
      'Margen %',
      `Saldo pasajero (${selectedCurrency})`,
      `Saldo proveedor (${selectedCurrency})`
    ],
    [selectedCurrency]
  );

  const buildExportRows = () => {
    const rows = sortedSales.map((sale) => {
      const profitMargin = sale.totalSalePrice > 0 ? (sale.profit / sale.totalSalePrice) * 100 : 0;
      const sellerName = (sale.createdBy?.fullName || sale.createdBy?.username || 'SISTEMA').toUpperCase();
      const currentSaleBalance = sale.sellerBalance
        ? (sale.saleCurrency === 'ARS' ? (sale.sellerBalance.ars || 0) : (sale.sellerBalance.usd || 0))
        : 0;
      const userInMaster = allUsers.find((u) => getSafeId(u._id) === getSafeId(sale.createdBy));
      const comisionPct = Number(userInMaster?.comision || sale.createdBy?.comision || 0);
      const comisionImp = (sale.profit || 0) * (comisionPct / 100);
      const destino = getComprehensiveSaleDestinationLabel(sale);
      const providerNames = (sale.services || [])
        .map((srv) => {
          const ms = allServices.find((x) => getSafeId(x._id) === getSafeId(srv.serviceId));
          return (ms?.providerId?.name || srv.providerId?.name || 'N/A').toUpperCase();
        })
        .join(' | ');
      const statusLabel = sale.status === 'open' ? 'Abierta' : sale.status === 'closed' ? 'Cerrada' : 'Cancelada';
      return {
        Fecha: new Date(sale.createdAt).toLocaleDateString('es-AR'),
        Pasajero: `${sale.clientId?.name || ''} ${sale.clientId?.surname || ''}`.trim(),
        Destino: destino,
        Proveedores: providerNames,
        Vendedor: sellerName,
        'Pendiente vendedor': formatCurrency(currentSaleBalance, selectedCurrency),
        Estado: statusLabel,
        Comisión: formatCurrency(comisionImp, selectedCurrency),
        '% Comisión': String(comisionPct),
        [`Precio (${selectedCurrency})`]: formatCurrency(sale.totalSalePrice, selectedCurrency),
        [`Costo (${selectedCurrency})`]: formatCurrency(sale.totalCost, selectedCurrency),
        [`Ganancia (${selectedCurrency})`]: formatCurrency(sale.profit, selectedCurrency),
        'Margen %': `${profitMargin.toFixed(1)}%`,
        [`Saldo pasajero (${selectedCurrency})`]: formatCurrency(sale.clientBalance || 0, selectedCurrency),
        [`Saldo proveedor (${selectedCurrency})`]: formatCurrency(sale.providerBalance || 0, selectedCurrency)
      };
    });

    rows.push({
      Fecha: 'TOTALES',
      Pasajero: '',
      Destino: '',
      Proveedores: '',
      Vendedor: '',
      'Pendiente vendedor': formatCurrency(totals.sumVendedores, selectedCurrency),
      Estado: '',
      Comisión: '',
      '% Comisión': '',
      [`Precio (${selectedCurrency})`]: formatCurrency(totals.sumPrecio, selectedCurrency),
      [`Costo (${selectedCurrency})`]: formatCurrency(totals.sumCosto, selectedCurrency),
      [`Ganancia (${selectedCurrency})`]: formatCurrency(totals.sumGanancia, selectedCurrency),
      'Margen %': `${totals.marginTotalPct.toFixed(1)}%`,
      [`Saldo pasajero (${selectedCurrency})`]: formatCurrency(totals.sumPasajero, selectedCurrency),
      [`Saldo proveedor (${selectedCurrency})`]: formatCurrency(totals.sumProveedor, selectedCurrency)
    });

    return rows;
  };

  const handleExportPdf = () => {
    if (!sortedSales.length) return;
    setExportBusy(true);
    try {
      const raw = buildExportRows();
      const pdfData = raw.map((row) => {
        const o = {};
        exportHeaders.forEach((h) => {
          o[h] = truncateExport(row[h], h.includes('Proveedores') || h.includes('Destino') ? 55 : 70);
        });
        return o;
      });
      const title = `Resumen de ventas — ${selectedCurrency}`;
      const stamp = new Date().toISOString().slice(0, 10);
      const doc = createReportPDF(pdfData, title, {
        filename: `resumen-ventas-${selectedCurrency}-${stamp}.pdf`,
        orientation: 'landscape'
      });
      downloadPDF(doc, `resumen-ventas-${selectedCurrency}-${stamp}.pdf`);
    } finally {
      setExportBusy(false);
    }
  };

  const handleExportExcel = () => {
    if (!sortedSales.length) return;
    setExportBusy(true);
    try {
      const rows = buildExportRows();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsvSemicolon(`resumen-ventas-${selectedCurrency}-${stamp}.csv`, exportHeaders, rows);
    } finally {
      setExportBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-20 w-20 border-4 border-t-primary-500"></div></div>;

  return (
    <div className="space-y-6">
      <div className="px-2">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-dark-800/40">
            <p className="text-xs text-dark-400 max-w-xl">
              Exportación según filtros y página actual del listado (cliente). Abrí el CSV en Excel o LibreOffice.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exportBusy || sortedSales.length === 0}
                onClick={handleExportPdf}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
              >
                Generar PDF
              </button>
              <button
                type="button"
                disabled={exportBusy || sortedSales.length === 0}
                onClick={handleExportExcel}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
              >
                Generar Excel (CSV)
              </button>
            </div>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-white/10 table-auto">
              <thead className="bg-dark-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark-300 uppercase cursor-pointer" onClick={() => handleSort('createdAt')}>Fecha {getSortIcon('createdAt')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark-300 uppercase max-w-[250px]">
                    <div className="flex flex-col space-y-1">
                      <span className="cursor-pointer text-base" onClick={() => handleSort('passenger')}>Pasajero {getSortIcon('passenger')}</span>
                      <span className="text-sm text-dark-200">Destino</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark-300 uppercase">
                    <div className="flex flex-col space-y-1">
                      <span>Proveedor</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark-300 uppercase cursor-pointer" onClick={() => handleSort('seller')}>Vendedor {getSortIcon('seller')}</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-dark-300 uppercase">Est.</th>
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
                  
                  // --- OBTENER EL BALANCE PENDIENTE DE COBRAR DE ESTA VENTA ---
                  const currentSaleBalance = sale.sellerBalance 
                    ? (sale.saleCurrency === 'ARS' ? (sale.sellerBalance.ars || 0) : (sale.sellerBalance.usd || 0))
                    : 0;

                  const userInMaster = allUsers.find(u => getSafeId(u._id) === getSafeId(sale.createdBy));
                  const comisionPct = Number(userInMaster?.comision || sale.createdBy?.comision || 0);
                  const comisionImp = (sale.profit || 0) * (comisionPct / 100);
                  const destino = getComprehensiveSaleDestinationLabel(sale);

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
                        <div className="text-[11px] font-bold text-accent-400 mt-1">
                          Pendiente: {formatCurrency(currentSaleBalance, sale.saleCurrency)}
                        </div>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter shadow-sm ${getStatusStyles(sale.status)}`}>
                          <span className="mr-1">{getStatusIcon(sale.status)}</span>
                          {sale.status === 'open' ? 'OPN' : sale.status === 'closed' ? 'CLD' : 'CAN'}
                        </span>
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
                  <td colSpan={3} className="px-4 py-6" aria-hidden="true" />
                  <td className="px-4 py-6 align-top text-right">
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-dark-300 uppercase tracking-wide">Balance vendedores</div>
                      <div className="mt-1 w-full max-w-[11rem] border-b border-solid border-white/35" />
                      <div className="mt-2 w-full">
                        <BalanceCell amount={totals.sumVendedores} currency={selectedCurrency} className="text-lg font-bold" />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-6 align-top" aria-hidden="true" />
                  <td className="px-4 py-6 align-top" aria-hidden="true" />
                  <td className="px-4 py-6 text-right align-top">
                    <div className="flex flex-col items-stretch w-full max-w-[14rem] ml-auto">
                      <div className="mt-1.5 w-full border-b border-solid border-white/35" />
                      <div className="mt-2 space-y-1.5 w-full">
                        <div className="flex justify-between items-baseline gap-3 text-sm">
                          <span className="text-xs text-dark-300 uppercase tracking-wide shrink-0">Precios</span>
                          <span className="text-dark-100 font-medium text-right tabular-nums">
                            <CurrencyDisplay>{formatCurrency(totals.sumPrecio, selectedCurrency)}</CurrencyDisplay>
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline gap-3 text-sm">
                          <span className="text-xs text-dark-300 uppercase tracking-wide shrink-0">Costos</span>
                          <span className="text-dark-300 text-right tabular-nums">
                            <CurrencyDisplay>{formatCurrency(totals.sumCosto, selectedCurrency)}</CurrencyDisplay>
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline gap-3 text-sm">
                          <span className="text-xs text-dark-300 uppercase tracking-wide shrink-0">Ganancia</span>
                          <span className={`font-bold text-right tabular-nums ${getAmountColor(totals.sumGanancia)}`}>
                            <CurrencyDisplay>{formatCurrency(totals.sumGanancia, selectedCurrency)}</CurrencyDisplay>
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-center align-top text-sm font-medium text-dark-100">
                    {totals.marginTotalPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-6 align-top text-right">
                    <div className="flex flex-col items-stretch w-full max-w-[14rem] ml-auto">
                      <div className="text-xs text-dark-300 uppercase tracking-wide text-center w-full">Balances</div>
                      <div className="mt-1.5 w-full border-b border-solid border-white/35" />
                      <div className="mt-2 space-y-1.5 w-full">
                        <div className="flex justify-between items-center gap-3">
                          <span className="text-xs text-dark-400 shrink-0">Pasajero</span>
                          <BalanceCell amount={totals.sumPasajero} currency={selectedCurrency} className="text-sm" />
                        </div>
                        <div className="flex justify-between items-center gap-3">
                          <span className="text-xs text-dark-400 shrink-0">Proveedor</span>
                          <BalanceCell amount={totals.sumProveedor} currency={selectedCurrency} className="text-sm" />
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {typeof totalSales === 'number' && totalSales > 0 && onPageChange && onRowsPerPageChange ? (
            <div className="px-6 py-4 border-t border-white/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-dark-300">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                    className="input-field text-sm py-1 px-2 w-20"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>

                <div className="text-sm text-dark-300">
                  Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, totalSales)} of {totalSales} sales
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn-secondary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-dark-300 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn-secondary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveSalesOverview;