'use client';

import { useState } from 'react';
import Link from 'next/link';
import OportunidadCard from './OportunidadCard';
import { signOut } from "next-auth/react"

// ============================================
// COMPONENTES PRESENTACIONALES
// ============================================

const UserAvatar = ({ name }) => (
  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-blue-600 
                  rounded-full flex items-center justify-center text-xl sm:text-2xl 
                  font-bold shadow-lg">
    {name?.charAt(0).toUpperCase()}
  </div>
);

const UserHeader = ({ user, roleLabels }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 mb-6 
                  border border-white/20">
    <div className="flex items-center gap-3 sm:gap-4">
      <UserAvatar name={user.name} />
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-base sm:text-lg truncate">
          {user.name}
        </p>
        <span className="inline-block text-xs bg-blue-500/30 text-blue-200 px-2 sm:px-3 
                        py-1 rounded-full border border-blue-400/50 mt-1">
          {roleLabels[user.role]}
        </span>
      </div>
    </div>
  </div>
);

const MenuItem = ({ icon, title, subtitle, href, isActive = false }) => (
  <Link href={href}>
    <div className={`group rounded-xl p-3 sm:p-4 transition-all duration-300 
                     cursor-pointer border
                     ${isActive 
                       ? 'bg-blue-600/20 border-blue-500/30' 
                       : 'bg-white/5 hover:bg-white/15 border-transparent hover:border-blue-400/50'
                     }
                     hover:shadow-lg hover:shadow-blue-500/20`}>
      <div className="flex items-center gap-3">
        <span className="text-xl sm:text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm sm:text-base truncate
                        ${isActive ? 'text-white' : 'text-white group-hover:text-blue-300'}
                        transition-colors`}>
            {title}
          </p>
          <p className={`text-xs truncate
                        ${isActive ? 'text-blue-300' : 'text-gray-400'}`}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  </Link>
);

 function LogoutButton() {
  return (
    <div
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="group bg-red-500/10 hover:bg-red-500/20 rounded-xl p-3 
                 transition-all duration-300 cursor-pointer border border-red-500/20 
                 hover:border-red-500/40"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg sm:text-xl">🚪</span>
        <p className="text-red-300 font-semibold group-hover:text-red-200 
                      transition-colors text-sm sm:text-base">
          Cerrar Sesión
        </p>
      </div>
    </div>
  )
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 sm:py-20">
    <div className="text-5xl sm:text-6xl mb-4">📭</div>
    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center px-4">
      No hay oportunidades aún
    </h3>
    <p className="text-blue-200 text-sm sm:text-base text-center">
      Las nuevas oportunidades aparecerán aquí
    </p>
  </div>
);

// ============================================
// COMPONENTE: Mobile Sidebar
// ============================================
const MobileSidebar = ({ isOpen, onClose, user, roleLabels, menuItems }) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden
                     animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-80 bg-gradient-to-b from-blue-950 to-blue-900
                        shadow-2xl z-50 transform transition-transform duration-300 sm:hidden
                        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white font-bold text-lg">Menú</h2>
          <button 
            onClick={onClose}
            className="text-white text-2xl hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
          <UserHeader user={user} roleLabels={roleLabels} />

          <nav className="space-y-3">
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
              Menú Principal
            </p>

            {menuItems.map((item, index) => (
              <div key={index} onClick={onClose}>
                <MenuItem {...item} />
              </div>
            ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-white/10">
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
};

// ============================================
// COMPONENTE: Desktop Sidebar
// ============================================
const DesktopSidebar = ({ user, roleLabels, menuItems }) => (
  <aside className="hidden sm:block w-64 lg:w-72 bg-gradient-to-b from-blue-950 to-blue-900 
                    p-4 lg:p-6 shadow-2xl border-r border-blue-700/50 overflow-y-auto">
    <UserHeader user={user} roleLabels={roleLabels} />

    <nav className="space-y-3">
      <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
        Menú Principal
      </p>

      {menuItems.map((item, index) => (
        <MenuItem key={index} {...item} />
      ))}
    </nav>

    <div className="mt-auto pt-6 border-t border-white/10">
      <LogoutButton />
    </div>
  </aside>
);

// ============================================
// COMPONENTE PRINCIPAL - Client Component
// ============================================
export default function MenuPageClient({ user, oportunidades: oportunidadesIniciales, menuItems, roleLabels }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [oportunidades, setOportunidades] = useState(oportunidadesIniciales);

  const handleDeleteOportunidad = (id) => {
    setOportunidades(prev => prev.filter(op => op.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col sm:flex-row 
                    bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      
      <DesktopSidebar 
        user={user} 
        roleLabels={roleLabels}
        menuItems={menuItems} 
      />

      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        roleLabels={roleLabels}
        menuItems={menuItems}
      />

      {/* Mobile Header */}
      <div className="sm:hidden bg-blue-950 p-4 border-b border-blue-700/50 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} />
            <div>
              <p className="text-white font-bold text-sm">{user.name}</p>
              <span className="text-xs text-blue-300">
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-white text-3xl hover:text-blue-300 transition-colors
                       active:scale-95 transform"
            aria-label="Abrir menú"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white 
                        mb-2 flex items-center gap-2 sm:gap-3">
            <span className="text-3xl sm:text-4xl">🎯</span>
            <span>Oportunidades Disponibles</span>
          </h1>
          <p className="text-blue-200 text-sm sm:text-base">
            Explora las últimas oportunidades publicadas
          </p>
        </div>

        {oportunidades.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {oportunidades.map((oportunidad) => (
              <OportunidadCard 
                key={oportunidad.id} 
                oportunidad={oportunidad}
                onDelete={handleDeleteOportunidad}
              />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}