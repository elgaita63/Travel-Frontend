import * as XLSX from 'xlsx';
import { downloadCsvSemicolon } from './csvExport';

const EXPORT_HEADERS = [
  'Proveedor',
  'Email',
  'Teléfono',
  'Sitio web',
  'Calle',
  'Ciudad',
  'Provincia',
  'País',
  'Código postal',
  'Dirección completa',
  'Fecha alta'
];

function formatAddressLine(provider) {
  const a = provider.contactInfo?.address;
  if (!a) return '';
  const parts = [a.street, a.city, a.state, a.country, a.zipCode].filter(Boolean);
  return parts.join(', ');
}

export function providersToExportRows(providers) {
  return (providers || []).map((p) => {
    const a = p.contactInfo?.address;
    const created = p.createdAt ? new Date(p.createdAt) : null;
    return {
      Proveedor: p.name ?? '',
      Email: p.contactInfo?.email ?? '',
      Teléfono: p.contactInfo?.phone ?? '',
      'Sitio web': p.contactInfo?.website ?? '',
      Calle: a?.street ?? '',
      Ciudad: a?.city ?? '',
      Provincia: a?.state ?? '',
      País: a?.country ?? '',
      'Código postal': a?.zipCode ?? '',
      'Dirección completa': formatAddressLine(p),
      'Fecha alta': created && !Number.isNaN(created.getTime()) ? created.toLocaleDateString('es-AR') : ''
    };
  });
}

export function downloadProvidersCsv(filename, providers) {
  const rows = providersToExportRows(providers);
  downloadCsvSemicolon(filename, EXPORT_HEADERS, rows);
}

export function downloadProvidersXlsx(filename, providers, sheetName = 'Proveedores') {
  const rows = providersToExportRows(providers);
  const wb = XLSX.utils.book_new();
  let ws;
  if (rows.length === 0) {
    ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS]);
  } else {
    ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS });
  }
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}
