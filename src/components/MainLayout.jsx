import React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col relative pb-12"> 
      {/* El pb-12 es para que el contenido no quede tapado por la barra */}
      
      {/* Acá se renderizan las páginas (Dashboard, etc.) */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* BARRA DE STATUS FIJA PARA TODO EL SISTEMA */}
      <footer className="fixed bottom-0 left-0 w-full bg-dark-800/95 backdrop-blur-sm border-t border-dark-700 py-3 text-center z-50">
        <p className="text-sm text-white font-mono tracking-wide">
          AMBIENTE: PRODUCCION | DB: mongoose jhsdh atlas marenostrum_prod | User: elgaita | Perfil: Admin | Fecha: 20/03/26 | Hora: 11:45
        </p>
      </footer>
    </div>
  );
};

export default MainLayout;