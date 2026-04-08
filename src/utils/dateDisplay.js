/**
 * Formatea fechas "solo día" (nacimiento, vencimiento) guardadas en ISO (medianoche UTC).
 * Evita que `new Date(iso).toLocaleDateString()` muestre el día anterior en zonas detrás de UTC.
 */
export function formatDateOnlyLocal(value, locale = 'es-AR') {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return new Date(y, m, day).toLocaleDateString(locale);
}

/**
 * De un instante ISO/Date (guardado como día calendario en UTC) → "YYYY-MM-DD" estable.
 */
export function toDateOnlyUTCString(value) {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Para fechas creadas en hora local (ej. celda del calendario), sin usar toISOString()
 * (evita correr un día en zonas detrás de UTC).
 */
export function toDateOnlyLocalCalendarString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Suma un día a "YYYY-MM-DD" en calendario local (inputs type="date").
 */
export function addOneDayToYMD(ymd) {
  if (!ymd || typeof ymd !== 'string') return '';
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!p) return '';
  const dt = new Date(Number(p[1]), Number(p[2]) - 1, Number(p[3]) + 1);
  return toDateOnlyLocalCalendarString(dt);
}

/**
 * Parse "YYYY-MM-DD" o ISO a Date en UTC mediodía (misma semántica que el backend).
 */
export function parseDateOnlyToUTC(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
