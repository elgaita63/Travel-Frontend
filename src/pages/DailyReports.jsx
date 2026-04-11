import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MessageCircle, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import api from '../utils/api';
import DailyReport from '../components/DailyReport';
import { useAuth } from '../contexts/AuthContext';

function toLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getArrivalRowKey(a) {
  return `${String(a.saleId)}|${String(a.passengerId)}|${String(a.serviceId)}|${new Date(a.eventDate).toISOString()}`;
}

function digitsForWhatsApp(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length >= 8 ? d : '';
}

function exportArrivalsPdf({ title, subtitle, rows, movementType }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 10;
  let y = margin;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text(subtitle, margin, y);
  doc.setTextColor(0);
  y += 10;

  const colWidths = [24, 42, 40, 44, 28, 28, 38];
  const headers = ['Fecha', 'Pasajero', 'Cliente', 'Servicio', 'Vendedor', 'Proveedor', 'Destino'];
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let x = margin;
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += colWidths[i];
  });
  y += 6;
  doc.setFont('helvetica', 'normal');

  const cell = (text, w) => doc.splitTextToSize(String(text || '').slice(0, 200), w - 1);

  rows.forEach((arrival) => {
    const eventRaw =
      movementType === 'departure'
        ? arrival.serviceDetails?.startDate
        : arrival.serviceDetails?.endDate;
    const dateStr = eventRaw ? new Date(eventRaw).toLocaleDateString() : '—';
    const rowTexts = [
      dateStr,
      `${arrival.passengerDetails?.name || ''} ${arrival.passengerDetails?.surname || ''}`.trim(),
      `${arrival.clientDetails?.name || ''} ${arrival.clientDetails?.surname || ''}`.trim(),
      arrival.serviceDetails?.title || '',
      arrival.saleDetails?.createdBy || '',
      arrival.serviceDetails?.providerName || '',
      `${arrival.serviceDetails?.location?.city || ''} ${arrival.serviceDetails?.location?.country || ''}`.trim()
    ];
    const lineBlocks = rowTexts.map((t, i) => cell(t, colWidths[i]));
    const rowHeight = Math.max(1, ...lineBlocks.map((lines) => lines.length)) * 4 + 2;
    if (y + rowHeight > 200) {
      doc.addPage();
      y = margin;
    }
    x = margin;
    lineBlocks.forEach((lines, i) => {
      doc.text(lines, x, y + 4);
      x += colWidths[i];
    });
    y += rowHeight;
  });

  doc.save(`arribos-partidas-${new Date().toISOString().slice(0, 10)}.pdf`);
}

const DailyReports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [todayArrivals, setTodayArrivals] = useState([]);
  const [agencyContactEmail, setAgencyContactEmail] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [checkedByKey, setCheckedByKey] = useState({});
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState(() => ({
    startDate: toLocalYMD(new Date()),
    endDate: toLocalYMD(new Date()),
    status: '',
    movementType: 'arrival'
  }));
  const [datePreset, setDatePreset] = useState('today');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    fetchTodayArrivals();
    fetchReports();
  }, [filters]);

  useEffect(() => {
    setServiceFilter('');
    setSellerFilter('');
  }, [filters.startDate, filters.endDate, filters.movementType]);

  const serviceOptions = useMemo(() => {
    const titles = new Set();
    todayArrivals.forEach((a) => {
      const t = (a.serviceDetails?.title || '').trim();
      if (t) titles.add(t);
    });
    return [...titles].sort((a, b) => a.localeCompare(b));
  }, [todayArrivals]);

  const sellerOptions = useMemo(() => {
    const names = new Set();
    todayArrivals.forEach((a) => {
      const s = (a.saleDetails?.createdBy || '').trim();
      if (s) names.add(s);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [todayArrivals]);

  const displayRows = useMemo(() => {
    let rows = todayArrivals;
    if (serviceFilter) {
      rows = rows.filter((r) => (r.serviceDetails?.title || '') === serviceFilter);
    }
    if (sellerFilter) {
      rows = rows.filter((r) => (r.saleDetails?.createdBy || '') === sellerFilter);
    }
    return rows;
  }, [todayArrivals, serviceFilter, sellerFilter]);

  useEffect(() => {
    setCheckedByKey((prev) => {
      const next = {};
      displayRows.forEach((a) => {
        const k = getArrivalRowKey(a);
        next[k] = prev[k] !== undefined ? prev[k] : true;
      });
      return next;
    });
  }, [displayRows]);

  const applyDatePreset = (id) => {
    setDatePreset(id);
    const now = new Date();
    if (id === 'today') {
      const t = toLocalYMD(now);
      setFilters((prev) => ({ ...prev, startDate: t, endDate: t }));
      return;
    }
    if (id === 'next2') {
      const start = new Date(now);
      const end = new Date(now);
      end.setDate(end.getDate() + 1);
      setFilters((prev) => ({
        ...prev,
        startDate: toLocalYMD(start),
        endDate: toLocalYMD(end)
      }));
      return;
    }
    if (id === 'next7') {
      const start = new Date(now);
      const end = new Date(now);
      end.setDate(end.getDate() + 6);
      setFilters((prev) => ({
        ...prev,
        startDate: toLocalYMD(start),
        endDate: toLocalYMD(end)
      }));
      return;
    }
    if (id === 'week') {
      const dow = now.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      const start = new Date(now);
      start.setDate(now.getDate() + diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setFilters((prev) => ({
        ...prev,
        startDate: toLocalYMD(start),
        endDate: toLocalYMD(end)
      }));
      return;
    }
    if (id === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilters((prev) => ({
        ...prev,
        startDate: toLocalYMD(start),
        endDate: toLocalYMD(end)
      }));
    }
  };

  const fetchTodayArrivals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.movementType) params.append('movementType', filters.movementType);

      const response = await api.get(`/api/daily-reports/today-arrivals?${params.toString()}`);
      
      if (response.data.success) {
        setTodayArrivals(response.data.data.arrivals);
        setAgencyContactEmail(response.data.data.agencyContactEmail || '');
      }
    } catch (error) {
      console.error('Failed to fetch arrivals:', error);
      setError(error.response?.data?.message || 'Failed to fetch arrivals');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const t = toLocalYMD(new Date());
    setFilters({
      startDate: t,
      endDate: t,
      status: '',
      movementType: 'arrival'
    });
    setDatePreset('today');
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);
      
      const response = await api.get(`/api/daily-reports?${params.toString()}`);

      if (response.data.success) {
        setReports(response.data.data.reports);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch daily reports');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (date) => {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // First, try to fetch existing report for the date
      try {
        const existingResponse = await api.get(`/api/daily-reports/date/${targetDate}`);
        if (existingResponse.data.success) {
          setSelectedReport(existingResponse.data.data.report);
          setSelectedDate(targetDate);
          setShowReport(true);
          fetchReports(); // Refresh the list
          return;
        }
      } catch (fetchError) {
        // If no existing report found, continue to generate new one
        console.log('No existing report found for date:', targetDate);
      }

      // Generate new report if none exists
      const response = await api.post('/api/daily-reports/generate', {
        date: targetDate
      });

      if (response.data.success) {
        setSelectedReport(response.data.data.report);
        setSelectedDate(targetDate);
        setShowReport(true);
        fetchReports(); // Refresh the list
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to generate daily report');
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setSelectedDate(report.reportDate);
    setShowReport(true);
  };

  const handleCloseReport = (dataChanged = false) => {
    setShowReport(false);
    setSelectedReport(null);
    setSelectedDate('');
    
    // Refresh the reports list if data was changed
    if (dataChanged) {
      fetchReports();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      case 'generated':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'sent':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getWhatsAppStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'sent':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'responded':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const isRowChecked = (key) => checkedByKey[key] !== false;

  const toggleRowChecked = (key, e) => {
    e.stopPropagation();
    setCheckedByKey((prev) => {
      const wasChecked = prev[key] !== false;
      return { ...prev, [key]: !wasChecked };
    });
  };

  const selectedRowsForActions = useMemo(
    () => displayRows.filter((a) => checkedByKey[getArrivalRowKey(a)] !== false),
    [displayRows, checkedByKey]
  );

  const handleExportPdf = () => {
    const rows = displayRows.filter((a) => isRowChecked(getArrivalRowKey(a)));
    if (rows.length === 0) {
      toast.warning('No hay filas seleccionadas para exportar');
      return;
    }
    const title = filters.movementType === 'departure' ? 'Partidas' : 'Arribos';
    const subtitle = `${filters.startDate} — ${filters.endDate} · ${rows.length} registro(s)`;
    exportArrivalsPdf({ title, subtitle, rows, movementType: filters.movementType });
    toast.success('PDF generado');
  };

  const handleNotifyEmailSend = async () => {
    const msg = notifyMessage.trim();
    if (!msg) {
      toast.warning('Escribí un mensaje');
      return;
    }
    const rows = selectedRowsForActions;
    const emails = [
      ...new Set(
        rows.map((r) => (r.clientDetails?.email || '').trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    ];
    if (emails.length === 0) {
      toast.warning('Los registros seleccionados no tienen email de cliente válido');
      return;
    }
    try {
      setNotifySending(true);
      const res = await api.post('/api/daily-reports/notify-clients-email', {
        message: msg,
        emails
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Correos enviados');
        setShowNotifyModal(false);
        setNotifyMessage('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error al enviar');
    } finally {
      setNotifySending(false);
    }
  };

  const handleNotifyWhatsAppOpen = () => {
    const msg = notifyMessage.trim();
    if (!msg) {
      toast.warning('Escribí un mensaje');
      return;
    }
    const rows = selectedRowsForActions;
    const phones = [
      ...new Map(
        rows
          .map((r) => {
            const d = digitsForWhatsApp(r.clientDetails?.phone);
            return d ? [d, d] : null;
          })
          .filter(Boolean)
      ).values()
    ];
    if (phones.length === 0) {
      toast.warning('Los registros seleccionados no tienen teléfono válido');
      return;
    }
    const limit = 8;
    const slice = phones.slice(0, limit);
    slice.forEach((num) => {
      const url = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
    if (phones.length > limit) {
      toast.info(`Se abrieron ${limit} pestañas; hay ${phones.length} teléfonos distintos en total`);
    } else {
      toast.success('WhatsApp abierto');
    }
  };

  if (showReport) {
    return (
      <DailyReport
        date={selectedDate}
        reportId={selectedReport?._id}
        report={selectedReport}
        onClose={handleCloseReport}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6 font-poppins">
            Arribos y Partidas
          </h1>
          <p className="text-xl text-dark-300 max-w-3xl mx-auto mb-8">
            Gestion de reportes de arribos y partidas
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="card mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-4">Filtros</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Arribos / Partidas
                  </label>
                  <select
                    value={filters.movementType}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, movementType: e.target.value }))
                    }
                    className="input-field"
                  >
                    <option value="arrival">Arribos</option>
                    <option value="departure">Partidas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      setDatePreset('custom');
                      setFilters((prev) => ({ ...prev, startDate: e.target.value }));
                    }}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      setDatePreset('custom');
                      setFilters((prev) => ({ ...prev, endDate: e.target.value }));
                    }}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Estado (reportes)
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Todos</option>
                    <option value="draft">Draft</option>
                    <option value="generated">Generated</option>
                    <option value="sent">Sent</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={clearFilters} className="btn-secondary w-full">
                    Restablecer
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 w-full rounded-2xl border border-primary-500/35 bg-gradient-to-br from-slate-900/80 via-primary-950/25 to-slate-900/80 px-4 py-4 shadow-lg shadow-primary-950/30 backdrop-blur-md sm:px-5">
            <p className="text-sm font-semibold text-primary-200 mb-2">Rango de fechas rápido</p>
            <p className="text-xs text-dark-400 mb-4">
              Por defecto se usa el día en curso. Elegí un atajo o ajustá las fechas arriba.
            </p>
            <div className="grid w-full grid-cols-5 gap-2">
              {[
                { id: 'today', label: 'Hoy' },
                { id: 'next2', label: 'Próximos 2 días' },
                { id: 'next7', label: 'Próximos 7 días' },
                { id: 'week', label: 'Esta semana' },
                { id: 'month', label: 'Este mes' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyDatePreset(id)}
                  className={`flex min-h-[2.75rem] w-full min-w-0 items-center justify-center rounded-full px-1 py-2 text-center text-[0.65rem] font-medium leading-snug transition-all sm:px-2 sm:text-xs md:text-sm ${
                    datePreset === id
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-900/40 ring-2 ring-primary-400/50'
                      : 'bg-dark-700/90 text-dark-200 border border-white/10 hover:border-primary-400/40 hover:text-dark-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions - HIDDEN */}
          {/* <div className="card mb-8">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-dark-100">Actions</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => generateReport()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={true}
                    title="Disabled: Use date filters and 'View Report' buttons instead"
                  >
                    Generate Today's Report
                  </button>
                  <button
                    onClick={() => setShowCustomDateModal(true)}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={true}
                    title="Disabled: Use date filters and 'View Report' buttons instead"
                  >
                    Generate Custom Date
                  </button>
                </div>
              </div>
            </div>
          </div> */}

          {error && (
            <div className="notification mb-8">
              <div className="flex items-center space-x-4">
                <div className="icon-container bg-error-500">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-error-400 font-medium text-lg">{error}</span>
              </div>
            </div>
          )}

          {/* Arribos / Partidas */}
          <div className="card">
            <div className="p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-lg font-semibold text-dark-100">
                  {filters.movementType === 'departure' ? 'Partidas' : 'Arribos'}{' '}
                  <span className="text-dark-400 font-normal text-base">
                    ({filters.startDate} — {filters.endDate})
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={loading || displayRows.length === 0}
                  className="self-end sm:self-start inline-flex items-center gap-2 rounded-lg border border-white/15 bg-dark-700/50 px-3 py-2 text-sm text-dark-100 hover:border-primary-400/40 hover:bg-dark-700 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Exportar filas seleccionadas a PDF"
                >
                  <FileDown className="h-4 w-4 text-primary-300" aria-hidden />
                  PDF
                </button>
              </div>
              <p className="text-sm text-dark-400 mb-3">
                {filters.movementType === 'departure'
                  ? 'Pasajeros con inicio de algún servicio en el rango (fecha de inicio del servicio en la venta).'
                  : 'Pasajeros con fin de algún servicio en el rango (fecha de fin del servicio en la venta).'}
              </p>
              <button
                type="button"
                onClick={() => setShowNotifyModal(true)}
                disabled={loading || displayRows.length === 0}
                className="mb-6 inline-flex items-center gap-2 rounded-lg border border-primary-500/35 bg-primary-950/30 px-4 py-2 text-sm font-medium text-primary-100 hover:bg-primary-950/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Mail className="h-4 w-4" aria-hidden />
                <MessageCircle className="h-4 w-4" aria-hidden />
                Notificación a clientes
              </button>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : todayArrivals.length === 0 ? (
                <div className="text-center py-8 text-dark-400">
                  <p>No hay pasajeros en el rango y tipo seleccionados.</p>
                  <p className="text-sm mt-2">
                    Probá otro rango (burbuja rápida o fechas manuales) o revisá las fechas de servicios en las ventas.
                  </p>
                </div>
              ) : displayRows.length === 0 ? (
                <div className="text-center py-8 text-dark-400">
                  <p>No hay filas con los filtros de servicio o vendedor actuales.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-dark-700/50">
                      <tr>
                        <th className="w-10 px-3 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                          <span className="sr-only">Incluir</span>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                          {filters.movementType === 'departure' ? 'Inicio' : 'Fin'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                          Passenger
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider min-w-[10rem]">
                          <label className="sr-only" htmlFor="filter-service-col">
                            Filtrar por servicio
                          </label>
                          <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-dark-400">
                            Service
                          </span>
                          <select
                            id="filter-service-col"
                            value={serviceFilter}
                            onChange={(e) => setServiceFilter(e.target.value)}
                            className="input-field max-w-[14rem] py-1.5 text-xs"
                          >
                            <option value="">Todos</option>
                            {serviceOptions.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider min-w-[9rem]">
                          <label className="sr-only" htmlFor="filter-seller-col">
                            Filtrar por vendedor
                          </label>
                          <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-dark-400">
                            Vendedor
                          </span>
                          <select
                            id="filter-seller-col"
                            value={sellerFilter}
                            onChange={(e) => setSellerFilter(e.target.value)}
                            className="input-field max-w-[12rem] py-1.5 text-xs"
                            disabled={user?.role === 'seller'}
                          >
                            <option value="">Todos</option>
                            {sellerOptions.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                          Destination
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-dark-800/30 divide-y divide-white/10">
                      {displayRows.map((arrival) => {
                        const rk = getArrivalRowKey(arrival);
                        const eventRaw =
                          filters.movementType === 'departure'
                            ? arrival.serviceDetails?.startDate
                            : arrival.serviceDetails?.endDate;
                        return (
                          <tr
                            key={rk}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/sales/${arrival.saleId}`)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`/sales/${arrival.saleId}`);
                              }
                            }}
                            className="cursor-pointer hover:bg-dark-700/30"
                          >
                            <td className="px-3 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-white/20 bg-dark-800 text-primary-500"
                                checked={isRowChecked(rk)}
                                onChange={(e) => toggleRowChecked(rk, e)}
                                aria-label="Incluir en exportar / notificar"
                              />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-dark-100">
                              {eventRaw ? new Date(eventRaw).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-dark-100">
                                {arrival.passengerDetails.name} {arrival.passengerDetails.surname}
                              </div>
                              <div className="text-sm text-dark-400">
                                {arrival.passengerDetails.passportNumber}
                              </div>
                              <div className="text-xs text-dark-500">
                                {arrival.passengerDetails.nationality}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-dark-100">
                                {arrival.clientDetails.name} {arrival.clientDetails.surname}
                              </div>
                              <div className="text-sm text-dark-400">
                                {arrival.clientDetails.email}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-dark-100">
                                {arrival.serviceDetails.title}
                              </div>
                              <div className="text-sm text-dark-400">
                                {arrival.serviceDetails.type}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-dark-100">
                              {arrival.saleDetails.createdBy || '—'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-dark-100">
                              {arrival.serviceDetails.providerName}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-dark-100">
                                {arrival.serviceDetails.location.city}
                              </div>
                              <div className="text-sm text-dark-400">
                                {arrival.serviceDetails.location.country}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {showNotifyModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notify-modal-title"
            >
              <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/15 p-6 shadow-xl">
                <h3 id="notify-modal-title" className="text-lg font-semibold text-dark-100 mb-2">
                  Notificación a clientes
                </h3>
                <p className="text-xs text-dark-400 mb-4">
                  Se usa la selección actual (filas con casilla marcada). Correo: destinatarios únicos por email de
                  cliente. WhatsApp: una pestaña por teléfono de cliente distinto.
                </p>
                {agencyContactEmail ? (
                  <p className="mb-3 rounded-md border border-white/10 bg-dark-800/40 px-3 py-2 text-sm text-dark-200">
                    <span className="text-dark-400">Remitente configurado (back): </span>
                    <span className="font-mono text-primary-200">{agencyContactEmail}</span>
                  </p>
                ) : null}
                <textarea
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  rows={6}
                  className="input-field mb-4 w-full resize-y"
                  placeholder="Escribí el mensaje…"
                />
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowNotifyModal(false);
                      setNotifyMessage('');
                    }}
                    disabled={notifySending}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary inline-flex items-center gap-2"
                    onClick={handleNotifyWhatsAppOpen}
                    disabled={notifySending}
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    className="btn-primary inline-flex items-center gap-2"
                    onClick={handleNotifyEmailSend}
                    disabled={notifySending}
                  >
                    <Mail className="h-4 w-4" />
                    {notifySending ? 'Enviando…' : 'Correo'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Date Modal - DISABLED */}
        {/* {showCustomDateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-white/20 w-96 shadow-lg rounded-md card-glass">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-dark-100 mb-4">
                  Generate Report for Custom Date
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="customDate" className="block text-sm font-medium text-dark-200 mb-2">
                      Select Date
                    </label>
                    <input
                      type="date"
                      id="customDate"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full px-3 py-2 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-dark-800/50 text-dark-100"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowCustomDateModal(false);
                        setCustomDate('');
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (customDate) {
                          generateReport(customDate);
                          setShowCustomDateModal(false);
                          setCustomDate('');
                        }
                      }}
                      disabled={!customDate}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default DailyReports;