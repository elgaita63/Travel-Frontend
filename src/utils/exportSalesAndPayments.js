import * as XLSX from 'xlsx';
import { downloadCsvSemicolon } from './csvExport';

export const EXPORT_PAGE_SIZE = 500;

export function buildSalesListExportParams(filters) {
  const p = new URLSearchParams();
  p.set('search', filters.search ?? '');
  if (filters.status) p.set('status', filters.status);
  if (filters.startDate) p.set('startDate', filters.startDate);
  if (filters.endDate) p.set('endDate', filters.endDate);
  if (filters.dateRangeType) p.set('dateRangeType', filters.dateRangeType);
  if (filters.providerId) p.set('providerId', filters.providerId);
  if (filters.currency) p.set('currency', filters.currency);
  if (filters.cupoId) p.set('cupoId', filters.cupoId);
  if (filters.createdByIds && filters.createdByIds.length > 0) {
    p.set('createdBy', filters.createdByIds.join(','));
  }
  return p;
}

function earliestTripStart(sale) {
  if (!sale.services?.length) return '';
  const dates = sale.services
    .filter((s) => s.serviceDates && s.serviceDates.startDate)
    .map((s) => new Date(s.serviceDates.startDate));
  if (!dates.length) return '';
  return new Date(Math.min(...dates)).toLocaleDateString('es-AR');
}

const SALES_HEADERS = [
  'ID',
  'Nombre venta',
  'Destino',
  'Estado',
  'Moneda',
  'Total venta',
  'Costo',
  'Ganancia',
  'Cliente',
  'Vendedor',
  'Fecha creación',
  'Inicio viaje (aprox.)'
];

const PAYMENTS_HEADERS = [
  'ID',
  'Fecha',
  'Tipo',
  'Método',
  'Monto',
  'Moneda',
  'Estado',
  'ID venta',
  'Destinatario pago',
  'Usuario',
  'Referencia',
  'ID transacción'
];

export function salesToExportRows(sales) {
  return (sales || []).map((s) => {
    const id = s._id || s.id;
    const client = s.clientId;
    const clientLabel =
      client && typeof client === 'object'
        ? `${client.name || ''} ${client.surname || ''}`.trim()
        : '';
    const seller = s.createdBy && typeof s.createdBy === 'object' ? s.createdBy.username || '' : '';
    return {
      ID: id ? String(id) : '',
      'Nombre venta': s.nombreVenta ?? '',
      Destino: s.destination ?? '',
      Estado: s.status ?? '',
      Moneda: s.saleCurrency ?? '',
      'Total venta': s.totalSalePrice ?? '',
      Costo: s.totalCost ?? '',
      Ganancia: s.profit ?? '',
      Cliente: clientLabel,
      Vendedor: seller,
      'Fecha creación': s.createdAt ? new Date(s.createdAt).toLocaleString('es-AR') : '',
      'Inicio viaje (aprox.)': earliestTripStart(s)
    };
  });
}

export function paymentsToExportRows(payments) {
  return (payments || []).map((p) => {
    const sid = p.saleId && typeof p.saleId === 'object' ? p.saleId._id || p.saleId.id : p.saleId;
    const payTo = p.paymentTo && typeof p.paymentTo === 'object' ? p.paymentTo.name || '' : '';
    const by = p.createdBy && typeof p.createdBy === 'object' ? p.createdBy.username || '' : '';
    return {
      ID: p._id ? String(p._id) : '',
      Fecha: p.date ? new Date(p.date).toLocaleString('es-AR') : '',
      Tipo: p.type ?? '',
      Método: p.method ?? '',
      Monto: p.amount ?? '',
      Moneda: p.currency ?? '',
      Estado: p.status ?? '',
      'ID venta': sid ? String(sid) : '',
      'Destinatario pago': payTo,
      Usuario: by,
      Referencia: p.reference ?? '',
      'ID transacción': p.transactionId ?? ''
    };
  });
}

export function downloadSalesCsv(filename, sales) {
  const rows = salesToExportRows(sales);
  downloadCsvSemicolon(filename, SALES_HEADERS, rows);
}

export function downloadPaymentsCsv(filename, payments) {
  const rows = paymentsToExportRows(payments);
  downloadCsvSemicolon(filename, PAYMENTS_HEADERS, rows);
}

export function downloadSalesAndPaymentsXlsx(filename, sales, payments) {
  const saleRows = salesToExportRows(sales);
  const payRows = paymentsToExportRows(payments);
  const wb = XLSX.utils.book_new();
  const wsSales =
    saleRows.length === 0
      ? XLSX.utils.aoa_to_sheet([SALES_HEADERS])
      : XLSX.utils.json_to_sheet(saleRows, { header: SALES_HEADERS });
  const wsPay =
    payRows.length === 0
      ? XLSX.utils.aoa_to_sheet([PAYMENTS_HEADERS])
      : XLSX.utils.json_to_sheet(payRows, { header: PAYMENTS_HEADERS });
  XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas');
  XLSX.utils.book_append_sheet(wb, wsPay, 'Pagos');
  XLSX.writeFile(wb, filename);
}
