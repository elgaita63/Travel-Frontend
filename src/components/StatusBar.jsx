import React, { useState, useEffect } from 'react';

const StatusBar = ({ user }) => {
  const [sysInfo, setSysInfo] = useState({
    env: 'CARGANDO...',
    dbHost: '...',
    dbName: '...'
  });
  const [now, setNow] = useState(new Date());

  // 1. Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Pedir info al backend (Usando la ruta que confirmaste que funciona)
  useEffect(() => {
    const fetchSysInfo = async () => {
      try {
        // Forzamos la URL que acabás de probar exitosamente
        const response = await fetch('http://localhost:5000/api/system/version');
        const result = await response.json();
        
        if (result.success) {
          setSysInfo({
            env: result.environment ? result.environment.toLowerCase() : 'development',
            dbHost: result.database.host || 'localhost',
            dbName: result.database.name || 'marenostrum_dev'
          });
        }
      } catch (err) {
        console.error('Error de conexión en StatusBar:', err);
        setSysInfo(prev => ({ ...prev, env: 'error de conexión' }));
      }
    };
    fetchSysInfo();
  }, []);

  // 3. Lógica de colores según el ambiente (Cyan para desarrollo, Rojo para test)
  let envColorClass = 'text-dark-300'; // Default
  if (sysInfo.env === 'development' || sysInfo.env === 'local') envColorClass = 'text-cyan-400 font-bold';
  if (sysInfo.env === 'test') envColorClass = 'text-red-500 font-bold';

  const userName = user?.username || user?.email || 'elgaita';
  const userRole = user?.role || 'Admin';
  const fechaStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const horaStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-dark-800/95 backdrop-blur-sm border-t border-dark-700 py-2 text-center z-50">
      <p className={`text-[11px] font-mono tracking-wider ${envColorClass}`}>
        AMBIENTE: {sysInfo.env.toUpperCase()} | DB : : mongoose {sysInfo.dbHost} {sysInfo.dbName} | User : {userName} | Perfil : {userRole} | Fecha : {fechaStr} | Hora : {horaStr}
      </p>
    </footer>
  );
};

export default StatusBar;