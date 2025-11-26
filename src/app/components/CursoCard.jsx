'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/**
 * CursoCard Component
 * Patrón: Presentational Component con estado interno mínimo
 * Versión mejorada con optimizaciones de imagen y responsive
 */
export default function CursoCard({ curso }) {
  const [imageError, setImageError] = useState(false);

  const {
    id,
    nombre,
    descripcion,
    duracion,
    nivel,
    profesorNombre,
    profesorImagen,
  } = curso;

  return (
    <Link
      href={`/menu/ver-cursos/${id}`}
      className="group bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 hover:shadow-2xl transition-all duration-300 border border-white/10 hover:border-blue-400/50 flex flex-col h-full"
    >
      {/* Imagen del profesor con fallback optimizado */}
      <CursoImage
        profesorImagen={profesorImagen}
        profesorNombre={profesorNombre}
        imageError={imageError}
        setImageError={setImageError}
        nivel={nivel}
      />

      {/* Contenido de la card */}
      <div className="p-4 md:p-5 bg-gradient-to-b from-white/5 to-transparent flex-grow flex flex-col">
        {/* Título del curso */}
        <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
          {nombre}
        </h3>

        {/* Descripción (opcional) */}
        {descripcion && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
            {descripcion}
          </p>
        )}

        {/* Info del profesor */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <span className="text-lg">👨‍🏫</span>
          <p className="truncate">{profesorNombre || 'Profesor'}</p>
        </div>

        {/* Metadata: duración y nivel */}
        {(duracion || nivel) && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {duracion && (
              <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-300 rounded-full">
                ⏱️ {duracion}
              </span>
            )}
            {nivel && (
              <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-300 rounded-full">
                {getNivelIcon(nivel)} {nivel}
              </span>
            )}
          </div>
        )}

        {/* Espaciador flexible */}
        <div className="flex-grow" />

        {/* Footer de la card */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-500">Ver detalles</span>
          <span className="text-blue-400 group-hover:translate-x-1 transition-transform">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * CursoImage Sub-component
 * Maneja la imagen del profesor con fallbacks
 */
function CursoImage({ profesorImagen, profesorNombre, imageError, setImageError, nivel }) {
  const showFallback = !profesorImagen || imageError;

  return (
    <div className="relative overflow-hidden h-48 md:h-56 bg-gradient-to-br from-blue-500 to-purple-600">
      {!showFallback ? (
        <img
          src={profesorImagen}
          alt={profesorNombre || 'Profesor'}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <FallbackImage profesorNombre={profesorNombre} />
      )}

      {/* Overlay en hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Badge flotante */}
      <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
        {nivel ? `${getNivelIcon(nivel)} ${nivel}` : 'Curso'}
      </div>
    </div>
  );
}

/**
 * FallbackImage Sub-component
 * Imagen por defecto cuando no hay imagen del profesor
 */
function FallbackImage({ profesorNombre }) {
  const [fallbackError, setFallbackError] = useState(false);

  if (fallbackError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl md:text-7xl mb-2">👨‍🏫</div>
          <p className="text-sm font-medium">{profesorNombre || 'Profesor'}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src="/images/profesores/default-profesor.jpg"
      alt={profesorNombre || 'Profesor'}
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      onError={() => setFallbackError(true)}
      loading="lazy"
    />
  );
}

/**
 * Helper: Obtiene el ícono según el nivel del curso
 */
function getNivelIcon(nivel) {
  const iconos = {
    basico: '🌱',
    básico: '🌱',
    intermedio: '🔥',
    avanzado: '🚀',
  };
  return iconos[nivel?.toLowerCase()] || '📚';
}