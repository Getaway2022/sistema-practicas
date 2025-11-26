'use client';

import { useState } from 'react';
import Link from 'next/link';
import CursoCard from '../../components/CursoCard';

/**
 * VerCursosPage - Versión Refactorizada con Responsive Design
 * Incluye menú hamburguesa para móviles que despliega el sidebar
 */
export default function VerCursosPage({ user, cursos }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) {
    return <UnauthorizedView />;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-black via-blue-950 to-black text-white">
      {/* Botón hamburguesa para móviles */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-blue-900 hover:bg-blue-800 p-3 rounded-lg shadow-lg border border-blue-700 transition-colors"
        aria-label="Toggle menu"
      >
        <span className="text-2xl">{isSidebarOpen ? '✕' : '☰'}</span>
      </button>

      {/* Overlay para cerrar sidebar en móvil */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Menú lateral mejorado y responsive */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen
          w-72 bg-gradient-to-b from-blue-900 to-blue-950 
          p-6 flex flex-col gap-6 shadow-2xl border-r border-blue-800
          z-40 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Perfil de usuario */}
        <div className="bg-blue-800/50 rounded-xl p-4 backdrop-blur-sm border border-blue-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-2xl font-bold shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-lg truncate">{user.name}</p>
              <p className="text-xs text-blue-300 truncate">{user.rol || 'Estudiante'}</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex flex-col gap-3">
          <Link
            href="/menu"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800/50 transition-all duration-200 group"
          >
            <span className="text-xl">🏠</span>
            <span className="font-medium group-hover:translate-x-1 transition-transform">
              Volver al menú
            </span>
          </Link>

          <div className="mt-4 pt-4 border-t border-blue-800">
            <p className="text-xs text-blue-300 uppercase tracking-wider mb-2 px-4">
              Estadísticas
            </p>
            <div className="bg-blue-800/30 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-300">{cursos.length}</p>
              <p className="text-sm text-gray-400">Cursos disponibles</p>
            </div>
          </div>
        </nav>
      </aside>

      {/* Contenido principal mejorado */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 lg:mt-0">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            📚 Cursos Disponibles
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            Explora y aprende con nuestros cursos especializados
          </p>
        </div>

        {/* Grid de cursos */}
        {cursos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
            {cursos.map((curso) => (
              <CursoCard key={curso.id} curso={curso} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * UnauthorizedView Component
 * Vista para usuarios no autenticados
 */
function UnauthorizedView() {
  return (
    <div className="flex items-center justify-center min-h-screen text-white bg-gradient-to-br from-black to-blue-950 p-4">
      <div className="text-center max-w-md">
        <div className="text-5xl md:text-6xl mb-4">🔒</div>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Acceso Restringido</h2>
        <p className="text-sm md:text-base text-gray-300 mb-6">
          Por favor inicia sesión para continuar
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-semibold"
        >
          Ir al login
        </Link>
      </div>
    </div>
  );
}

/**
 * EmptyState Component
 * Vista cuando no hay cursos disponibles
 */
function EmptyState() {
  return (
    <div className="text-center py-12 md:py-20">
      <div className="text-5xl md:text-6xl mb-4 animate-bounce">📭</div>
      <h3 className="text-xl md:text-2xl font-semibold text-gray-400">
        No hay cursos disponibles
      </h3>
      <p className="text-sm md:text-base text-gray-500 mt-2">
        Vuelve pronto para ver nuevos contenidos
      </p>
    </div>
  );
}