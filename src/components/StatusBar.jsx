import React, { useState, useEffect } from 'react';

const StatusBar = ({ user }) => {
  const [sysInfo, setSysInfo] = useState({
    env: 'CONECTANDO...',
    dbHost: '...',
    dbName: '...'
  });
  const [now, setNow] = useState(new Date());

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch de información del sistema
  useEffect(() => {
    const fetchSysInfo = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/system/version`);
        const result = await response.json();
        
        if (result.success) {
          setSysInfo({
            env: result.environment || 'LOCAL',
            dbHost: result.database.host || '...',
            dbName: result.database.name || '...'
          });
        }
      } catch (err) {
        setSysInfo({ env: 'DESCONECTADO', dbHost: 'ERROR', dbName: 'ERROR' });
        console.error('Error en StatusBar:', err);
      }
    };
    fetchSysInfo();
  }, []);

  // Lógica de Usuario: Si no hay login, es ANÓNIMO
  const userName = user ? (user.username || user.email) : 'ANÓNIMO';
  const userRole = user ? (user.role || 'Invitado') : '---';

  // Formato de Fecha y Hora
  const fechaStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const horaStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Lógica de alerta: Todo lo que NO sea PRODUCTION va en ROJO
  const isProduction = sysInfo.env.toUpperCase() === 'PRODUCTION';
  const alertStyle = !isProduction ? { color: '#ff0000', fontWeight: 'bold' } : {};

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-white/10 py-2 text-center z-50">
      <p className="text-[11px] font-mono tracking-wider uppercase" style={{ color: '#a3a3a3' }}>
        AMBIENTE: <span style={alertStyle}>{sysInfo.env}</span> | 
        DB: {sysInfo.dbHost} <span style={alertStyle}>{sysInfo.dbName}</span> | 
        USER: {userName} | 
        PERFIL: {userRole} | 
        FECHA: {fechaStr} | 
        HORA: {horaStr}
      </p>
    </footer>
  );
};

export default StatusBar;