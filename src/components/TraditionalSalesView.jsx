import React from 'react';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from './CurrencyDisplay';

// TruncatedText interno para mantener la funcionalidad idéntica
const TruncatedText = ({ text, className = '', title = '' }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const textRef = React.useRef(null);

  React.useEffect(() => {
    if (textRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [text]);

  const handleDoubleClick = () => {
    if (isOverflowing) setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={textRef}
      className={`${className} ${isExpanded ? 'overflow-auto' : 'truncate'} ${isOverflowing ? 'cursor-pointer hover:bg-dark-700/20 rounded px-1 -mx-1' : ''} notranslate`}
      title={isOverflowing ? `${title || text} (Doble clic para expandir)` : (title || text)}
      onDoubleClick={handleDoubleClick}
      style={isExpanded ? { maxHeight: '100px', whiteSpace: 'normal' } : {}}
      translate="no"
    >
      {text}
    </div>
  );
};

const TraditionalSalesView = ({ 
  sales, 
  clients, 
  selectedCurrency, 
  formatCurrencyJSX, 
  formatDate, 
  getInitials, 
  getEarliestStartDate, 
  getLatestEndDate,
  totalSales,
  totalPages,
  currentPage,
  rowsPerPage,
  handlePageChange,
  handleRowsPerPageChange,
  totalClients,
  debouncedFilters,
  navigate,
  fetchClients // Para la función de Promote
}) => {
  return (
    <>
      {/* CONTENEDOR 4: Sales by Passengers */}
      <div className="card overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-dark-100">Ventas por Pasajeros</h2>
        </div>
        {clients.length === 0 ? (
          <div className="py-20 px-6">
            <div className="flex items-center justify-center mb-6">
              <div className="icon-container bg-primary-500 mr-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-3xl font-semibold text-dark-100">
                {Object.values(debouncedFilters).some(f => f) ? 'No se encontraron pasajeros' : 'Sin pasajeros aún'}
              </h3>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full">
              <table className="w-full divide-y divide-white/10 table-fixed">
                <thead className="bg-dark-700">
                  <tr>
                    <th className="w-48 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Pasajero</th>
                    <th className="w-24 px-6 py-3 text-center text-xs font-semibold text-dark-300 uppercase">Cant.</th>
                    <th className="w-32 px-6 py-3 text-right text-xs font-semibold text-dark-300 uppercase">Total</th>
                    <th className="w-32 px-6 py-3 text-right text-xs font-semibold text-dark-300 uppercase">Ganancia</th>
                    <th className="w-32 px-6 py-3 text-center text-xs font-semibold text-dark-300 uppercase">Última Venta</th>
                    <th className="w-24 px-6 py-3 text-center text-xs font-semibold text-dark-300 uppercase">Estado</th>
                    <th className="w-32 px-6 py-3 text-center text-xs font-semibold text-dark-300 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {clients.filter(client => client.sales?.some(sale => sale.saleCurrency === selectedCurrency)).map((client) => {
                    const filteredSales = client.sales.filter(sale => sale.saleCurrency === selectedCurrency);
                    return (
                      <tr key={client._id} className="table-row cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center mr-4">
                              <span className="text-sm font-medium text-white">{getInitials(client.name, client.surname)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-dark-100 truncate">{client.name.toUpperCase()} {client.surname.toUpperCase()}</div>
                              <div className="text-sm text-dark-400 truncate">DNI: {client.dni || 'No DNI'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-dark-100">{filteredSales.length}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-dark-100">
                          <CurrencyDisplay>{formatCurrencyJSX(filteredSales.reduce((sum, sale) => sum + (sale.totalSalePrice || 0), 0), selectedCurrency, 'en-US', '')}</CurrencyDisplay>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-dark-100">
                          <CurrencyDisplay>{formatCurrencyJSX(filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0), selectedCurrency, 'en-US', '')}</CurrencyDisplay>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-dark-400">{client.latestSale ? formatDate(client.latestSale.createdAt) : 'No sales'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`badge ${client.hasSales ? 'badge-success' : 'badge-secondary'}`}>
                            {client.hasSales ? 'CON VENTAS' : 'SIN VENTAS'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => navigate(`/sales/${client.latestSale?._id}`)} className="text-primary-400 hover:text-primary-300 text-xs">Ver Última</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Paginación Pasajeros */}
            {totalClients > 0 && (
              <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-dark-300">Filas:</span>
                  <select value={rowsPerPage} onChange={(e) => handleRowsPerPageChange(Number(e.target.value))} className="input-field text-sm w-16">
                    <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="btn-secondary text-xs px-3 py-1">Anterior</button>
                  <span className="text-sm text-dark-300">Pág {currentPage} de {totalPages}</span>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="btn-secondary text-xs px-3 py-1">Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CONTENEDOR 5: Listado General de Ventas */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-dark-100">Listado General de Ventas</h2>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full divide-y divide-white/10 table-fixed min-w-[1200px]">
            <thead className="bg-dark-700">
              <tr>
                <th className="w-48 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Pasajero</th>
                <th className="w-32 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Destino</th>
                <th className="w-32 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Acompañantes</th>
                <th className="w-28 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Servicios</th>
                <th className="w-32 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Venta</th>
                <th className="w-32 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Costo</th>
                <th className="w-32 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Ganancia</th>
                <th className="w-32 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Comisión</th>
                <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Estado</th>
                <th className="w-32 px-6 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Acciones</th>
                <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Vendedor & Saldos</th>
                <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sales.filter(sale => sale.saleCurrency === selectedCurrency).map((sale) => {
                const earliestStartDate = getEarliestStartDate(sale);
                const latestEndDate = getLatestEndDate(sale);
                const userComisionPct = sale.createdBy?.comision || 0;
                const comisionImporte = (sale.profit || 0) * (userComisionPct / 100);

                return (
                  <tr key={sale.id || sale._id} className="table-row">
                    <td className="px-6 py-4">
                      <TruncatedText text={`${sale.clientId?.name} ${sale.clientId?.surname}`} className="text-sm font-medium text-dark-100" />
                      <TruncatedText text={sale.clientId?.email} className="text-sm text-dark-400" />
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-100">{sale.services?.[0]?.destino || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-dark-100">{sale.passengers.length}</td>
                    <td className="px-6 py-4 text-sm text-dark-100">{sale.services.length}</td>
                    <td className="px-6 py-4 font-medium"><CurrencyDisplay>{formatCurrencyJSX(sale.totalSalePrice, selectedCurrency)}</CurrencyDisplay></td>
                    <td className="px-6 py-4 text-dark-100"><CurrencyDisplay>{formatCurrencyJSX(sale.totalCost, selectedCurrency)}</CurrencyDisplay></td>
                    <td className={`px-6 py-4 font-medium ${sale.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      <CurrencyDisplay>{formatCurrencyJSX(sale.profit, selectedCurrency)}</CurrencyDisplay>
                    </td>
                    <td className="px-6 py-4 font-bold text-accent-400">
                      <CurrencyDisplay>{formatCurrencyJSX(comisionImporte, selectedCurrency)}</CurrencyDisplay>
                      <div className="text-[10px] text-dark-400 font-normal">({userComisionPct}%)</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="badge badge-primary uppercase text-[10px]">{sale.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => navigate(`/sales/${sale.id || sale._id}`)} className="text-primary-400 hover:text-primary-300">Ver Detalle</button>
                    </td>
                    <td className="px-4 py-4">
                      <TruncatedText text={sale.createdBy?.fullName || sale.createdBy?.username || 'Sistema'} className="text-sm text-dark-100" />
                      <div className="flex flex-col mt-1 space-y-0.5 text-[10px] font-bold">
                        <span className="text-primary-400">ARS: {formatCurrencyJSX(sale.createdBy?.saldoArs || 0, 'ARS')}</span>
                        <span className="text-success-500">USD: {formatCurrencyJSX(sale.createdBy?.saldoUsd || 0, 'USD')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-dark-400">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Paginación General */}
        {totalSales > 0 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-dark-300">Filas:</span>
              <select value={rowsPerPage} onChange={(e) => handleRowsPerPageChange(Number(e.target.value))} className="input-field text-sm w-16">
                <option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="btn-secondary text-xs px-3 py-1">Anterior</button>
              <span className="text-sm text-dark-300">Pág {currentPage} de {totalPages}</span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="btn-secondary text-xs px-3 py-1">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};