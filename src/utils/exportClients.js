import * as XLSX from 'xlsx';
import { downloadCsvSemicolon } from './csvExport';

const EXPORT_HEADERS = [
  'Nombre',
  'Apellido',
  'DNI/CUIT',
  'CUIT empresa',
  'Email',
  'Teléfono',
  'Pasaporte',
  'Nacionalidad',
  'Titular principal',
  'Estado',
  'Calle',
  'Ciudad',
  'Provincia',
  'País',
  'CP',
  'Fecha alta'
];

function formatAddress(client) {
  const a = client.address;
  if (!a) return { street: '', city: '', state: '', country: '', zip: '' };
  return {
    street: a.street ?? '',
    city: a.city ?? '',
    state: a.state ?? '',
    country: a.country ?? '',
    zip: a.zipCode ?? ''
  };
}

function isTitularPrincipalRow(c) {
  if (c.relationshipType === 'companion') return false;
  if (c.isMainClient === false) return false;
  return true;
}

export function clientsToExportRows(clients) {
  return (clients || []).map((c) => {
    const a = formatAddress(c);
    const created = c.createdAt ? new Date(c.createdAt) : null;
    return {
      Nombre: c.name ?? '',
      Apellido: c.surname ?? '',
      'DNI/CUIT': c.dni ?? '',
      'CUIT empresa': c.companyCuit ?? '',
      Email: c.email ?? '',
      Teléfono: c.phone ?? '',
      Pasaporte: c.passportNumber ?? '',
      Nacionalidad: c.nationality ?? '',
      'Titular principal': isTitularPrincipalRow(c) ? 'Sí' : 'No',
      Estado: c.status ?? '',
      Calle: a.street,
      Ciudad: a.city,
      Provincia: a.state,
      País: a.country,
      CP: a.zip,
      'Fecha alta': created && !Number.isNaN(created.getTime()) ? created.toLocaleDateString('es-AR') : ''
    };
  });
}

export function downloadClientsCsv(filename, clients) {
  const rows = clientsToExportRows(clients);
  downloadCsvSemicolon(filename, EXPORT_HEADERS, rows);
}

export function downloadClientsXlsx(filename, clients, sheetName = 'Pasajeros') {
  const rows = clientsToExportRows(clients);
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
