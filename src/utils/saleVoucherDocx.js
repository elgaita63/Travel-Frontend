/**
 * Voucher de venta en Word (.docx) editable.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun
} from 'docx';

function formatLongES(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function nightsBetween(start, end) {
  if (!start || !end) return 0;
  const a = new Date(start).setHours(0, 0, 0, 0);
  const b = new Date(end).setHours(0, 0, 0, 0);
  const n = Math.round((b - a) / 86400000);
  return Math.max(0, n);
}

export function refFromSaleId(id) {
  const s = String(id || '');
  if (s.length >= 7) {
    const num = parseInt(s.slice(-8), 16) % 10000000;
    return String(num).padStart(7, '0');
  }
  return s.slice(-7) || '0000000';
}

function getPassengerList(sale) {
  const out = [];
  const rows = sale.passengers || [];
  for (const ps of rows) {
    const p = ps.passengerId || ps;
    if (!p || typeof p !== 'object') continue;
    const name = [p.name, p.surname].filter(Boolean).join(' ').trim();
    if (name) out.push(name.toLowerCase());
  }
  return out;
}

function buildNecessityContactLines(sale) {
  const seller = sale.createdBy?.email ? String(sale.createdBy.email).trim() : '';
  const agency = (
    sale.agencyContactEmail ||
    import.meta.env.VITE_AGENCY_CONTACT_EMAIL ||
    ''
  ).trim();
  const line1 = 'En caso de necesidad, contactar a:';
  if (!seller && !agency) return [line1, '—'];
  if (seller && agency && seller.toLowerCase() === agency.toLowerCase()) {
    return [line1, seller];
  }
  if (seller && agency) return [line1, `${seller} (vendedor) o ${agency} (agencia)`];
  if (seller) return [line1, `${seller} (vendedor)`];
  return [line1, `${agency} (agencia)`];
}

function formatProviderAddress(provider) {
  if (!provider?.contactInfo?.address) return '';
  const a = provider.contactInfo.address;
  const parts = [a.street, a.city, a.state, a.zipCode, a.country].filter(Boolean);
  return parts.join(', ');
}

function getFirstProviderFromService(serviceSale) {
  if (!serviceSale) return null;
  if (serviceSale.providers?.length) {
    const p = serviceSale.providers[0].providerId;
    return typeof p === 'object' && p ? p : null;
  }
  if (serviceSale.providerId && typeof serviceSale.providerId === 'object') {
    return serviceSale.providerId;
  }
  return null;
}

function collectDatesFromSale(sale) {
  let start = null;
  let end = null;
  const services = sale.services || [];
  for (const s of services) {
    const dates = [];
    if (s.serviceDates?.startDate) dates.push(new Date(s.serviceDates.startDate));
    if (s.serviceDates?.endDate) dates.push(new Date(s.serviceDates.endDate));
    if (s.providers?.length) {
      for (const pr of s.providers) {
        if (pr.startDate) dates.push(new Date(pr.startDate));
        if (pr.endDate) dates.push(new Date(pr.endDate));
      }
    }
    for (const d of dates) {
      if (!Number.isNaN(d.getTime())) {
        if (!start || d < start) start = d;
        if (!end || d > end) end = d;
      }
    }
  }
  if (!start && sale.createdAt) start = new Date(sale.createdAt);
  if (!end && start) end = new Date(start.getTime() + 7 * 86400000);
  return { start, end };
}

function isAccommodationService(serviceSale) {
  const t = `${serviceSale.serviceTypeName || ''} ${serviceSale.serviceName || ''} ${serviceSale.serviceId?.typeId?.name || ''}`.toLowerCase();
  return /hotel|aloj|habitaci|hostal|resort|suite|pensión|pension/i.test(t);
}

function sectionLabelForSale(sale) {
  const services = sale.services || [];
  const first = services[0];
  if (first && isAccommodationService(first)) return 'Alojamiento';
  return 'Servicio';
}

function starsFromRating(n) {
  const r = Math.min(5, Math.max(0, Math.round(Number(n) || 0)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

/** @returns {Promise<{ data: Uint8Array, type: 'png'|'jpg'|'gif'|'bmp' } | null>} */
async function fetchLogoBuffer(url) {
  const u = String(url || '').trim();
  if (!u) return null;
  try {
    const res = await fetch(u, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const t = blob.type || '';
    if (t.includes('svg') || t.includes('webp')) return null;
    let type = 'png';
    if (t.includes('jpeg') || t.includes('jpg')) type = 'jpg';
    else if (t.includes('gif')) type = 'gif';
    else if (t.includes('bmp')) type = 'bmp';
    else if (!t.includes('png')) return null;
    const buf = await blob.arrayBuffer();
    return { data: new Uint8Array(buf), type };
  } catch {
    return null;
  }
}

/** size en docx = medios puntos (22 = 11 pt) */
function tx(text, opts = {}) {
  return new TextRun({
    text: String(text),
    bold: opts.bold,
    size: opts.size != null ? opts.size * 2 : undefined,
    color: opts.color
  });
}

function para(children, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 160 },
    alignment: opts.align,
    border: opts.border,
    children
  });
}

function hrLine() {
  return new Paragraph({
    spacing: { after: 120 },
    border: {
      bottom: {
        color: 'BBBBBB',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6
      }
    },
    children: [new TextRun(' ')]
  });
}

/**
 * @param {object} sale
 * @returns {Promise<Document>}
 */
export async function createSaleVoucherDocx(sale) {
  const agencyName = import.meta.env.VITE_AGENCY_NAME || 'Agencia';
  const logoBuf = await fetchLogoBuffer(import.meta.env.VITE_AGENCY_LOGO || '');

  const title = (sale.nombreVenta || sale.destination?.city || 'Reserva').toString().toUpperCase();
  const { start, end } = collectDatesFromSale(sale);
  const nights = nightsBetween(start, end);
  const dateRangeStr =
    start && end
      ? `${formatLongES(start)} - ${formatLongES(end)} (${nights} noche${nights === 1 ? '' : 's'})`
      : '—';

  const ref = refFromSaleId(sale._id || sale.id);
  const passengers = getPassengerList(sale);
  const paxLine = `${passengers.length} pasajero${passengers.length === 1 ? '' : 's'}`;

  const primaryService = (sale.services && sale.services[0]) || {};
  const provider = getFirstProviderFromService(primaryService);
  const hotelName =
    provider?.name ||
    primaryService.serviceName ||
    (primaryService.serviceId && (primaryService.serviceId.destino || primaryService.serviceId.title)) ||
    '—';
  const hotelAddress = formatProviderAddress(provider) || '—';
  const hotelPhone =
    (provider?.contactInfo && provider.contactInfo.phone) || provider?.phone || '—';

  const roomType =
    primaryService.serviceName ||
    primaryService.serviceTypeName ||
    (primaryService.serviceId && primaryService.serviceId.destino) ||
    '—';

  const section = sectionLabelForSale(sale);
  const ratingStars = provider?.rating ? starsFromRating(provider.rating) : '';

  const [contactL1, contactL2] = buildNecessityContactLines(sale);

  const guestBlock = passengers.length ? passengers.join(', ') : paxLine;

  const legal = [
    'EARLY CHECK IN: sujeto a disponibilidad del hotel; pueden aplicar cargos adicionales según política del establecimiento.',
    'LATE CHECK OUT: hasta horarios indicados por el hotel; pueden aplicar cargos por habitación o por persona.',
    'Impuestos locales / tasas de estadía: pueden abonarse directamente en el hotel según normativa vigente.',
    'Cunas: sujetas a disponibilidad; costo adicional según hotel.',
    'Depósito de garantía: algunos hoteles solicitan depósito en efectivo o tarjeta al check-in.',
    'Tipo de cama (twin / matrimonial): sujeto a disponibilidad en destino.',
    'Los horarios y montos exactos confirman con el voucher del operador o del hotel.'
  ];

  const headerLeftChildren = [
    para([tx(agencyName, { bold: true, size: 22 })], { after: logoBuf ? 80 : 200 })
  ];

  if (logoBuf?.data?.length) {
    headerLeftChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new ImageRun({
            data: logoBuf.data,
            transformation: { width: 200, height: 92 },
            type: logoBuf.type
          })
        ]
      })
    );
  }

  const headerRightChildren = [
    para([tx(contactL1, { size: 9, color: '505050' })], { align: AlignmentType.RIGHT, after: 60 }),
    para([tx(contactL2, { size: 9, color: '505050' })], { align: AlignmentType.RIGHT, after: 120 })
  ];

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: headerLeftChildren
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: headerRightChildren
          })
        ]
      })
    ]
  });

  const titleRow = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [para([tx(title, { bold: true, size: 14 })], { after: 80 })]
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              para([tx(dateRangeStr, { size: 10 })], { align: AlignmentType.RIGHT, after: 80 })
            ]
          })
        ]
      })
    ]
  });

  const fechasChildren =
    start && end
      ? [
          new Paragraph({
            spacing: { after: 40 },
            children: [tx(formatLongES(start), { size: 11 })]
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [tx(formatLongES(end), { size: 11 })]
          })
        ]
      : [para([tx('—', { size: 11 })], { after: 40 })];

  const reservationTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [para([tx('Referencia de reserva', { bold: true, size: 9 })])] }),
          new TableCell({ children: [para([tx('Huéspedes', { bold: true, size: 9 })])] }),
          new TableCell({ children: [para([tx('Noches', { bold: true, size: 9 })])] }),
          new TableCell({ children: [para([tx('Fechas', { bold: true, size: 9 })])] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [para([tx(ref, { size: 11 })])] }),
          new TableCell({ children: [para([tx(guestBlock, { size: 11 })])] }),
          new TableCell({
            children: [para([tx(`${nights} Noche${nights === 1 ? '' : 's'}`, { size: 11 })])]
          }),
          new TableCell({ children: fechasChildren })
        ]
      })
    ]
  });

  const operatorChildren = [
    para([tx('Operador:', { bold: true, size: 11 })], { after: 60 }),
    para([tx(String(hotelName), { size: 11 })], { after: 80 })
  ];
  if (ratingStars) {
    operatorChildren.push(para([tx(ratingStars, { size: 12, color: 'C8A000' })], { after: 80 }));
  }
  operatorChildren.push(
    para([tx(String(hotelAddress), { size: 10 })], { after: 80 }),
    para([tx(`Tel: ${hotelPhone}`, { size: 10 })], { after: 80 })
  );

  const roomChildren = [
    para([tx(String(roomType), { bold: true, size: 11 })], { after: 100 }),
    para([tx('Pasajeros:', { size: 10 })], { after: 60 }),
    ...passengers.map((name) => para([tx(`• ${name}`, { size: 10 })], { after: 40 }))
  ];

  const establishmentTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: operatorChildren
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: roomChildren
          })
        ]
      })
    ]
  });

  const children = [
    headerTable,
    new Paragraph({ spacing: { after: 200 } }),
    titleRow,
    hrLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 80 },
      children: [tx(section, { bold: true, size: 12 })]
    }),
    hrLine(),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [
        tx('Bono — Entrada. Reserva confirmada y garantizada', {
          bold: true,
          size: 10,
          color: '228B22'
        })
      ]
    }),
    para([tx('Tu reserva', { bold: true, size: 12 })], { after: 120 }),
    reservationTable,
    new Paragraph({ spacing: { after: 200 } }),
    para([tx('Establecimiento y habitación', { bold: true, size: 12 })], { after: 120 }),
    establishmentTable,
    new Paragraph({ spacing: { after: 200 } }),
    para([tx('Condiciones y notas importantes', { bold: true, size: 11 })], { after: 120 }),
    ...legal.map((t) =>
      new Paragraph({
        spacing: { after: 100 },
        children: [tx(t, { size: 9 })]
      })
    ),
    new Paragraph({
      spacing: { before: 200 },
      children: [
        tx(
          `Documento generado el ${new Date().toLocaleString('es-AR')} — ID venta: ${sale._id || sale.id}`,
          { size: 8, color: '888888' }
        )
      ]
    })
  ];

  return new Document({
    sections: [{ properties: {}, children }]
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadSaleVoucherDocx(sale) {
  const doc = await createSaleVoucherDocx(sale);
  const blob = await Packer.toBlob(doc);
  const ref = refFromSaleId(sale._id || sale.id);
  triggerDownload(blob, `Voucher-${ref}.docx`);
}
