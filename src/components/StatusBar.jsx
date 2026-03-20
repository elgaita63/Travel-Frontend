import React, { useState, useEffect } from 'react';

const StatusBar = ({ user }) => {
  const [sysInfo, setSysInfo] = useState({
    env: 'CARGANDO...',
    dbHost: '...',
    dbName: '...'
  });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSysInfo = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/system/version');
        const result = await response.json();
        if (result.success) {
          setSysInfo({
            env: result.environment ? result.environment.toUpperCase() : 'LOCAL',
            dbHost: result.database.host,
            dbName: result.database.name
          });
        }
      } catch (err) {
        console.error('Error en StatusBar:', err);
      }
    };
    fetchSysInfo();
  }, []);

  // Lógica de colores según tu pedido: Dev y Test en ROJO, Prod Natural
  const getEnvStyle = (env) => {
    switch (env) {
      case 'PRODUCTION':
        // Colores naturales de la app
        return 'bg-dark-800/95 text-dark-300 border-white/10';
      case 'DEVELOPMENT':
      case 'LOCAL':
      case 'DEV':
      case 'TEST':
        // ROJO TOTAL para alertar que no es producción
        return 'bg-red-600 text-white font-bold border-red-800';
      default:
        return 'bg-dark-800/95 text-dark-300 border-white/10';
    }
  };

  const envClass = getEnvStyle(sysInfo.env);
  const userName = user?.username || user?.email || 'elgaita';
  const userRole = user?.role || 'Admin';
  const fechaStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const horaStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <footer className={`fixed bottom-0 left-0 w-full backdrop-blur-sm border-t py-2 text-center z-50 transition-colors duration-500 ${envClass}`}>
      <p className="text-[11px] font-mono tracking-wider">
        AMBIENTE: {sysInfo.env} | DB : : mongoose {sysInfo.dbHost} {sysInfo.dbName} | User : {userName} | Perfil : {userRole} | Fecha : {fechaStr} | Hora : {horaStr}
      </p>
    </footer>
  );
};

export default StatusBar;