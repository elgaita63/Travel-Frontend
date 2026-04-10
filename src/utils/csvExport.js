/**
 * CSV con separador ; y BOM UTF-8 (abre bien en Excel / LibreOffice en es-AR).
 */
export function downloadCsvSemicolon(filename, headers, rows) {
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
