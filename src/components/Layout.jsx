import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageTransition from './PageTransition';
import StatusBar from './StatusBar';
import ReleaseNotesModal from './ReleaseNotesModal';

const Layout = ({ children, showNavigation = true }) => {
  const { user, logout, isAdmin, isSeller, version, isImpersonating, stopImpersonating } = useAuth();
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    { path: '/dashboard', label: 'Panel de Control', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" /></svg>) },
    { path: '/clients', label: 'Pasajeros', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>) },
    { path: '/providers', label: 'Proveedores', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>) },
    ...(isSeller || isAdmin ? [{ path: '/inventory', label: 'Cupos', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>) }] : []),
    { path: '/sales', label: 'Ventas', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>) },
    ...(isAdmin ? [
      { path: '/daily-reports', label: 'Arribos y Partidas', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>) },
      { path: '/admin-insights', label: 'Estadísticas y Reportes', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>) },
      { 
        path: user?.isSuper ? '/system-config' : '/settings', 
        label: user?.isSuper ? 'Parámetros Globales' : 'Configuración', 
        icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>) 
      }
    ] : isSeller ? [
      { 
        path: '/settings', 
        label: 'Perfil de Usuario', 
        icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>) 
      }
    ] : []),
  ];

  const balancesItem = { path: '/balances', label: 'Saldos/Balances', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>) };

  return (
    <PageTransition>
      <div className="flex h-screen relative overflow-hidden bg-dark-900 font-sans text-dark-100">
        {showNavigation && (
          <div className="flex w-16 sm:w-20 md:w-72 flex-col h-full">
            <div className="flex flex-col h-full bg-dark-800 border-r border-white/10 relative">
              
              <div className="flex flex-col items-center flex-shrink-0 px-2 sm:px-4 md:px-6 pt-5 pb-2">
                <div className="flex items-center w-full">
                  <div className="icon-container mr-2 sm:mr-3 md:mr-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h1 className="hidden md:block text-2xl font-bold gradient-text font-poppins tracking-wider">
                    Travel AI Management
                  </h1>
                </div>
                <div className="w-full text-right pr-2">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setReleaseNotesOpen(true)}
                      className="text-[10px] font-mono font-bold text-primary-400 hover:text-primary-300 underline decoration-primary-500/50 underline-offset-2 hover:decoration-primary-300 transition-colors cursor-pointer text-right"
                      title="Ver modificaciones y pendientes (solo administración)"
                    >
                      {version}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-dark-400">{version}</span>
                  )}
                </div>
              </div>
              
              <div className="border-b border-white/10 mx-4 sm:mx-6 md:mx-8 mb-6"></div>

              <div className="flex-grow overflow-y-auto custom-scrollbar px-1 sm:px-2 md:px-4">
                <nav className="flex-1 space-y-1 pb-10">
                  {navigationItems.map((item) => (
                    <React.Fragment key={item.path}>
                      <Link 
                        to={item.path} 
                        className={`nav-link flex items-center p-2 rounded-lg text-dark-100 hover:text-white hover:bg-dark-700/50 transition-all duration-200 ${location.pathname === item.path ? 'active bg-dark-700 font-semibold text-white' : ''}`} 
                        title={item.label}
                      >
                        <span className="mr-1 sm:mr-2 md:mr-3 text-primary-400">{item.icon}</span>
                        <span className="hidden md:block text-2xl font-medium">{item.label}</span>
                      </Link>

                      {item.path === '/sales' && (isSeller || isAdmin) && (
                        <div className="hidden md:block mt-1 mb-2 ml-4 space-y-1 border-l border-white/10 pl-3">
                          <Link
                            to="/sales/new"
                            className={`flex items-center w-full p-2 rounded-lg text-2xl font-medium transition-all duration-200 border-2 border-sky-400/90 bg-sky-500/15 ${
                              location.pathname === '/sales/new'
                                ? 'bg-primary-600/95 text-white font-semibold border-sky-300 shadow-[0_0_0_1px_rgba(56,189,248,0.45)]'
                                : 'text-dark-200 hover:text-white hover:bg-sky-500/25 hover:border-sky-300'
                            }`}
                            title="Nueva venta"
                          >
                            <span className="mr-2 text-primary-400 flex-shrink-0">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </span>
                            Nueva venta
                          </Link>
                          <Link
                            to="/search"
                            className={`flex items-center w-full p-2 rounded-lg text-2xl font-medium transition-all duration-200 ${
                              location.pathname === '/search'
                                ? 'bg-dark-700 text-white font-semibold'
                                : 'text-dark-200 hover:text-white hover:bg-dark-700/60'
                            }`}
                            title="Buscar ventas"
                          >
                            <span className="mr-2 text-primary-400 flex-shrink-0">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </span>
                            Buscar ventas
                          </Link>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              </div>

              {user && (
                <div className="flex-shrink-0 border-t border-white/10 p-2 sm:p-4 md:p-6 bg-dark-800">
                  <div className="w-full bg-dark-700 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-base md:text-lg">
                        {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-2 sm:ml-3 md:ml-4 flex-1 hidden md:block min-w-0">
                        <p className="text-base font-bold text-dark-100 truncate">{user?.username || user?.email}</p>
                        <p className="text-xs text-dark-400 uppercase tracking-wide">
                          {user?.isSuper ? 'OVERLORD / SOPORTE' : (user?.role === 'admin' ? 'Administrador' : 'Vendedor')}
                        </p>
                      </div>
                      <button onClick={logout} className="ml-auto p-2 text-dark-400 hover:text-error-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 overflow-hidden relative">
          {/* BARRA DE AVISO DE SUPLANTACIÓN (SOLO APARECE SI ESTÁS SUPLANTANDO) */}
          {isImpersonating && (
            <div className="bg-error-600 text-white px-4 py-2 flex items-center justify-between z-[50] shadow-lg animate-pulse-slow">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="font-bold text-sm uppercase tracking-wider">
                  Estás visualizando la cuenta de: <span className="underline">{user?.username || user?.email}</span>
                </span>
              </div>
              <button 
                onClick={stopImpersonating}
                className="bg-white text-error-600 px-4 py-1 rounded-full font-bold text-xs hover:bg-dark-100 transition-colors shadow-md"
              >
                SALIR Y VOLVER A MI SESIÓN
              </button>
            </div>
          )}

          <header className="h-[110px] flex items-center justify-center px-8 bg-dark-900 sticky top-0 z-40 relative">
            <div className="flex items-center">
              <img 
                src={import.meta.env.VITE_AGENCY_LOGO} 
                alt={`Logo ${import.meta.env.VITE_AGENCY_NAME}`} 
                className="h-24 w-auto mr-6 object-contain"
              />
              <h2 className="text-2xl font-bold font-poppins tracking-wider gradient-text">
                {import.meta.env.VITE_AGENCY_NAME}
              </h2>
            </div>
            <div className="absolute bottom-[-2px] left-8 right-8 border-b border-white/20"></div>
          </header>

          <main className="flex-1 overflow-y-auto pb-16 bg-dark-900">
            <div className="pt-8 pb-8 px-12">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </div>
          </main>
        </div>

        <StatusBar user={user} />

        {isAdmin && (
          <ReleaseNotesModal
            isOpen={releaseNotesOpen}
            onClose={() => setReleaseNotesOpen(false)}
            isSuper={!!user?.isSuper}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default Layout;