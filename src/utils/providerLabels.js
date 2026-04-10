/** Etiquetas en español para valores de proveedor provenientes del backend */

export const PROVIDER_TYPE_LABELS = {
  hotel: 'Hotel',
  airline: 'Aerolínea',
  tour: 'Tour',
  transport: 'Transporte',
  insurance: 'Seguro',
  other: 'Otro',
};

export const providerTypeLabel = (value) =>
  value ? PROVIDER_TYPE_LABELS[String(value).toLowerCase()] || value : '—';
