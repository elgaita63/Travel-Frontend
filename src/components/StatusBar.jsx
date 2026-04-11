import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const StatusBar = ({ user: propUser }) => {
  const { user, version, remainingSeconds, sessionIdleEnabled } = useAuth();
  const [sysInfo, setSysInfo] = useState({ env: '...', dbHost: '...', dbName: '...' });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSysInfo = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/system/version`);
        const result = await response.json();
        if (result.success) {
          setSysInfo({ env: result.environment || 'LOCAL', dbHost: result.database.host || '...', dbName: result.database.name || '...' });
        }
      } catch (err) { console.error('Error en StatusBar:', err); }
    };
    fetchSysInfo();
  }, []);

  const userName = user ? (user.username || user.email) : 'ANÓNIMO';
  const fechaStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const horaStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isProduction = sysInfo.env.toUpperCase() === 'PRODUCTION';

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-white/10 py-2 text-center z-50">
      <p className="text-[11px] font-mono tracking-wider uppercase text-[#a3a3a3]">
        AMBIENTE: <span style={!isProduction ? { color: '#ff0000', fontWeight: 'bold' } : {}}>{sysInfo.env}</span> | 
        DB: {sysInfo.dbHost} <span style={!isProduction ? { color: '#ff0000' } : {}}>{sysInfo.dbName}</span> | 
        USER: {userName} | 
        {user && (
          <>
            <span
              title="Segundos hasta cierre por inactividad (se reinicia con mouse o teclado)"
              className={
                sessionIdleEnabled && remainingSeconds != null && remainingSeconds < 60
                  ? 'text-error-500 font-bold animate-pulse'
                  : 'text-primary-400'
              }
            >
              REMSEGS:{' '}
              {sessionIdleEnabled && remainingSeconds != null
                ? formatTime(remainingSeconds)
                : '—'}
            </span>{' '}
            |
          </>
        )}
        VER: {version} | FECHA: {fechaStr} | HORA: {horaStr}
      </p>
    </footer>
  );
};

export default StatusBar;