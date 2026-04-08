/**
 * Proveedores únicos asociados a los servicios de una venta (legacy providerId + array providers).
 * @returns {Array<{ _id: string, name: string }>}
 */
export function getUniqueProvidersFromSale(sale) {
  if (!sale?.services || !Array.isArray(sale.services)) return [];
  const map = new Map();

  for (const svc of sale.services) {
    if (svc.providers && svc.providers.length) {
      for (const p of svc.providers) {
        const provObj = p.providerId && typeof p.providerId === 'object' ? p.providerId : null;
        const id = provObj?._id || p.providerId;
        if (!id) continue;
        const key = String(id);
        if (!map.has(key)) {
          map.set(key, {
            _id: key,
            name: provObj?.name || 'Proveedor'
          });
        }
      }
    }
    if (svc.providerId) {
      const prov = typeof svc.providerId === 'object' ? svc.providerId : { _id: svc.providerId };
      const id = prov._id || prov;
      if (!id) continue;
      const key = String(id);
      if (!map.has(key)) {
        map.set(key, {
          _id: key,
          name: prov.name || 'Proveedor'
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Líneas de costo (costProvider) en servicios de la venta para un proveedor concreto.
 * Incluye `providers[]` por entrada y el modelo legacy `providerId` + `costProvider` en el servicio.
 * @returns {Array<{ label: string, amount: number, currency: string }>}
 */
export function getProviderCostBreakdownFromSale(sale, providerId) {
  if (!sale?.services || !Array.isArray(sale.services) || !providerId) return [];
  const pid = String(providerId);
  const lines = [];

  for (const svc of sale.services) {
    const serviceLabel = svc.serviceName || svc.serviceTypeName || 'Servicio';
    if (svc.providers?.length) {
      for (const p of svc.providers) {
        const raw = p.providerId;
        const id =
          raw && typeof raw === 'object' ? String(raw._id) : raw != null ? String(raw) : '';
        if (id !== pid) continue;
        lines.push({
          label: serviceLabel,
          amount: Number(p.costProvider ?? 0),
          currency: (p.currency || 'USD').toUpperCase()
        });
      }
    } else if (svc.providerId) {
      const raw = svc.providerId;
      const id =
        raw && typeof raw === 'object' ? String(raw._id) : raw != null ? String(raw) : '';
      if (id === pid) {
        lines.push({
          label: serviceLabel,
          amount: Number(svc.costProvider ?? 0),
          currency: (svc.currency || 'USD').toUpperCase()
        });
      }
    }
  }

  return lines;
}

/**
 * Suma de montos por moneda (para un solo renglón de totales).
 * @param {Array<{ amount: number, currency: string }>} lines
 * @returns {Array<{ currency: string, amount: number }>}
 */
export function summarizeProviderCostsByCurrency(lines) {
  const map = new Map();
  for (const l of lines) {
    const cur = (l.currency || 'USD').toUpperCase();
    map.set(cur, (map.get(cur) || 0) + (Number(l.amount) || 0));
  }
  return Array.from(map.entries()).map(([currency, amount]) => ({ currency, amount }));
}
