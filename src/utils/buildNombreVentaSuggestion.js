/**
 * Genera una sugerencia de nombre/identificación de venta a partir de
 * ciudades de destino y nombres de servicios contratados (plantilla + detalle).
 */
export function buildNombreVentaSuggestion(destination, serviceTemplateInstances) {
  const cities = [];
  const addCity = (c) => {
    if (c == null) return;
    const t = String(c).trim();
    if (t && !cities.some((x) => x.toLowerCase() === t.toLowerCase())) cities.push(t);
  };

  addCity(destination?.city);
  (serviceTemplateInstances || []).forEach((inst) => {
    addCity(inst.destination?.city);
  });

  const primaryCity = cities[0] || '';

  const labels = (serviceTemplateInstances || [])
    .map((inst) => {
      const name = (inst.serviceName || inst.templateName || '').trim();
      const info = (inst.serviceInfo || '').trim();
      if (name && info) return `${name}: ${info}`;
      return name || info || '';
    })
    .filter(Boolean);

  let servicesPart = labels.slice(0, 4).join(' · ');
  if (servicesPart.length > 130) servicesPart = `${servicesPart.slice(0, 127)}...`;

  let result;
  if (primaryCity && servicesPart) {
    result = `${primaryCity} — ${servicesPart}`;
  } else if (primaryCity) {
    result = `Viaje ${primaryCity}`;
  } else if (servicesPart) {
    result = servicesPart;
  } else {
    result = 'Venta / Reserva';
  }

  return result.slice(0, 200);
}
