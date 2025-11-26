'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function OportunidadCard({ oportunidad, onDelete }) {
  const { data: session } = useSession();
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAdmin = session?.user?.role === 'ADMINISTRATIVE';

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta oportunidad?')) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('✅ Oportunidad eliminada');
        if (onDelete) onDelete(oportunidad.id);
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('❌ Error de conexión');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-400 relative">
      {/* Botón de eliminar (solo para admin) */}
      {isAdmin && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-3 right-3 z-10 bg-red-600 hover:bg-red-700 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Eliminar oportunidad"
        >
          {isDeleting ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <span className="text-lg">🗑️</span>
          )}
        </button>
      )}

      {/* Imagen */}
      <div className="relative overflow-hidden h-52 bg-gradient-to-br from-blue-500 to-purple-600">
        {oportunidad.imagen && !imageError ? (
          <img
            src={oportunidad.imagen}
            alt={oportunidad.titulo}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-6xl">
            📋
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Contenido */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {oportunidad.titulo}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {oportunidad.descripcion.length > 120
            ? oportunidad.descripcion.substring(0, 120) + "..."
            : oportunidad.descripcion}
        </p>
        
        {/* Footer de la tarjeta */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {new Date(oportunidad.createdAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
          <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1 group/btn">
            Ver más
            <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}