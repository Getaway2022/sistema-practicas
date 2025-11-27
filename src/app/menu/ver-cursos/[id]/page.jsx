'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// ============================================
// CUSTOM HOOKS
// ============================================

const useCursoData = (id) => {
  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchCurso = async () => {
      try {
        const res = await fetch(`/api/cursos/${id}`);
        const data = await res.json();
        setCurso(data);
      } catch (error) {
        console.error('Error al cargar curso:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCurso();
  }, [id]);

  return { curso, loading };
};

const useNovedades = (cursoId) => {
  const [novedades, setNovedades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cursoId) return;
    const fetchNovedades = async () => {  // ✅ Correcto
      try {
        const res = await fetch(`/api/novedades/${cursoId}`);  // ✅ URL correcta
        const response = await res.json();
        
        if (response.success && response.data) {
          setNovedades(response.data);  // ✅ setNovedades correcto
        } else if (Array.isArray(response)) {
          setNovedades(response);  // ✅ Correcto
        } else {
          console.error('Formato de respuesta inesperado:', response);
          setNovedades([]);  // ✅ Correcto
        }
      } catch (error) {
        console.error('Error:', error);
        setNovedades([]);  // ✅ Correcto
      } finally {
        setLoading(false);
      }
    };
    fetchNovedades();
  }, [cursoId]);

  const crearNovedad = useCallback(async (contenido) => {
    if (!contenido.trim()) return false;
    try {
      const res = await fetch(`/api/novedades/${cursoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      });
      if (res.ok) {
        const nueva = await res.json();
        setNovedades((prev) => [nueva, ...prev]);
        return true;
      }
    } catch (error) {
      console.error('Error:', error);
    }
    return false;
  }, [cursoId]);

  return { novedades, loading, crearNovedad };
};

const useContratos = (cursoId, alumnoEmail) => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  if (!cursoId) return;
  const fetchContratos = async () => {
    try {
      const res = await fetch(`/api/contratos/${cursoId}`);
      const response = await res.json();
      
      // ✅ Validar que sea array
      if (response.success && response.data) {
        setContratos(Array.isArray(response.data) ? response.data : []);
      } else if (Array.isArray(response)) {
        setContratos(response);
      } else {
        console.error('Formato inesperado:', response);
        setContratos([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setContratos([]);  // ✅ Asegurar array vacío
    } finally {
      setLoading(false);
    }
  };
  fetchContratos();
}, [cursoId]);

    const subirContrato = useCallback(async (archivo) => {
  if (!archivo) return { success: false, error: 'No hay archivo' };
  if (!alumnoEmail) return { success: false, error: 'No se pudo obtener el email del usuario' };  // ✅ Nueva validación
  
  // ... validaciones ...

  try {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('alumnoEmail', alumnoEmail);

    console.log('📤 Subiendo contrato...', { cursoId, alumnoEmail, archivo: archivo.name });  // ✅ Log mejorado

    const res = await fetch(`/api/contratos/${cursoId}`, {
      method: 'POST',
      body: formData,
    });

    const responseData = await res.json();  // ✅ Parsear primero
    console.log('📥 Respuesta del servidor:', responseData);  // ✅ Log de respuesta

    if (res.ok) {
      const contrato = responseData.data || responseData;
      setContratos((prev) => [contrato, ...prev]);  // ✅ Agregar solo data
      return { success: true };
    } else {
      return { 
        success: false, 
        error: responseData.error || responseData.message || 'Error al subir'  // ✅ Mejor manejo
      };
    }
  } catch (error) {
    console.error('❌ Error al subir contrato:', error);
    return { success: false, error: 'Error de conexión: ' + error.message };  // ✅ Mensaje específico
  }
}, [cursoId, alumnoEmail]);

  const actualizarContrato = useCallback(async (contratoId, estado, comentario = '') => {
    try {
      const res = await fetch(`/api/contratos/${cursoId}/${contratoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, comentario }),
      });
      if (res.ok) {
        const actualizado = await res.json();
        setContratos((prev) =>
          prev.map((c) => (c.id === contratoId ? actualizado : c))
        );
        return true;
      }
    } catch (error) {
      console.error('Error:', error);
    }
    return false;
  }, [cursoId]);

  const eliminarContrato = useCallback(async (contratoId) => {
    try {
      const res = await fetch(`/api/contratos/${cursoId}/${contratoId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setContratos((prev) => prev.filter((c) => c.id !== contratoId));
        return true;
      }
    } catch (error) {
      console.error('Error:', error);
    }
    return false;
  }, [cursoId]);

  return { contratos, loading, subirContrato, actualizarContrato, eliminarContrato };
};

const useInformes = (cursoId, alumnoEmail) => {
  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!cursoId) return;
  const fetchInformes = async () => {
    try {
      const res = await fetch(`/api/informes/${cursoId}`);
      const response = await res.json();
      
      if (response.success && response.data) {
        setInformes(Array.isArray(response.data) ? response.data : []);  // ✅ Validar array
      } else if (Array.isArray(response)) {
        setInformes(response);
      } else {
        console.error('Formato inesperado:', response);
        setInformes([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setInformes([]);
    } finally {
      setLoading(false);
    }
  };
  fetchInformes();
}, [cursoId]);

 const subirInforme = useCallback(async (archivo) => {
  if (!archivo) return { success: false, error: 'No hay archivo' };
  if (!alumnoEmail) return { success: false, error: 'No se pudo obtener el email del usuario' };  // ✅ Nueva validación
  
  // ... validaciones ...

  try {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('alumnoEmail', alumnoEmail);

    console.log('📤 Subiendo informe...', { cursoId, alumnoEmail, archivo: archivo.name });  // ✅ Log

    const res = await fetch(`/api/informes/${cursoId}`, {
      method: 'POST',
      body: formData,
    });

    const responseData = await res.json();  // ✅ Parsear primero
    console.log('📥 Respuesta del servidor:', responseData);  // ✅ Log

    if (res.ok) {
      const informe = responseData.data || responseData;
      setInformes((prev) => [informe, ...prev]);  // ✅ Solo data
      return { success: true };
    } else {
      return { 
        success: false, 
        error: responseData.error || responseData.message || 'Error al subir'  // ✅ Mejor manejo
      };
    }
  } catch (error) {
    console.error('❌ Error al subir informe:', error);
    return { success: false, error: 'Error de conexión: ' + error.message };  // ✅ Específico
  }
}, [cursoId, alumnoEmail]);

  const actualizarInforme = useCallback(async (informeId, estado, feedback = '') => {
    try {
      const res = await fetch(`/api/informes/${cursoId}/${informeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, feedback }),
      });
      if (res.ok) {
        const actualizado = await res.json();
        setInformes((prev) =>
          prev.map((i) => (i.id === informeId ? actualizado : i))
        );
        return true;
      }
    } catch (error) {
      console.error('Error:', error);
    }
    return false;
  }, [cursoId]);

  const eliminarInforme = useCallback(async (informeId) => {
    try {
      const res = await fetch(`/api/informes/${cursoId}/${informeId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInformes((prev) => prev.filter((i) => i.id !== informeId));
        return true;
      }
    } catch (error) {
      console.error('Error:', error);
    }
    return false;
  }, [cursoId]);

  return { informes, loading, subirInforme, actualizarInforme, eliminarInforme };
};

// ============================================
// COMPONENTES UI
// ============================================

const LoadingScreen = ({ message = 'Cargando...' }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black to-blue-950 text-white">
    <div className="text-center">
      <div className="animate-spin text-6xl mb-4">⏳</div>
      <p className="text-xl">{message}</p>
    </div>
  </div>
);

const UnauthorizedScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black to-blue-950 text-white px-4">
    <div className="text-4xl sm:text-6xl mb-4">🔒</div>
    <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">Acceso Restringido</h2>
    <p className="text-gray-400 text-center">Debes iniciar sesión para continuar</p>
  </div>
);

const PageHeader = ({ curso, onBack }) => (
  <div className="relative bg-gradient-to-r from-blue-900 to-blue-950 border-b-2 border-blue-500 shadow-xl">
    <div className="absolute inset-0 bg-black/20"></div>
    <div className="relative px-4 sm:px-6 py-6 sm:py-8">
      <button
        onClick={onBack}
        className="absolute left-4 sm:left-6 top-4 sm:top-6 text-white/80 hover:text-white transition-all flex items-center gap-2 group bg-white/10 hover:bg-white/20 px-3 sm:px-4 py-2 rounded-lg backdrop-blur-sm"
      >
        <span className="text-lg sm:text-xl group-hover:-translate-x-1 transition-transform">←</span>
        <span className="text-xs sm:text-sm font-medium hidden sm:inline">Volver</span>
      </button>
      <div className="text-center pt-8 sm:pt-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-300 to-purple-400 bg-clip-text text-transparent px-16">
          {curso.nombre}
        </h1>
        <p className="text-blue-300 text-xs sm:text-sm">👨‍🏫 {curso.profesorNombre}</p>
      </div>
    </div>
  </div>
);

const TabNavigation = ({ activeTab, onTabChange, tabs }) => (
  <nav className="sticky top-0 z-10 bg-blue-900/95 backdrop-blur-sm border-b border-blue-700 shadow-lg">
    <div className="flex justify-start sm:justify-center gap-2 p-2 sm:p-4 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className="text-base sm:text-xl">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
          <span className="sm:hidden text-xs">{tab.shortLabel || tab.label}</span>
        </button>
      ))}
    </div>
  </nav>
);

const SectionHeader = ({ icon, title, description, bgColor = 'from-blue-500 to-purple-600' }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${bgColor} rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <h3 className="text-xl sm:text-2xl font-bold truncate">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-400 line-clamp-1">{description}</p>
    </div>
  </div>
);

const EmptyState = ({ icon, message, submessage }) => (
  <div className="text-center py-12 sm:py-16 bg-white/5 rounded-2xl backdrop-blur-sm">
    <div className="text-4xl sm:text-6xl mb-4">{icon}</div>
    <p className="text-gray-400 italic text-sm sm:text-base px-4">{message}</p>
    {submessage && <p className="text-gray-500 text-xs sm:text-sm mt-2 px-4">{submessage}</p>}
  </div>
);

// ============================================
// SECCIONES
// ============================================

const NovedadesSection = ({ novedades, onCrearNovedad, isProfessor }) => {
  const [nuevaNovedad, setNuevaNovedad] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onCrearNovedad(nuevaNovedad);
    if (success) setNuevaNovedad('');
    setIsSubmitting(false);
  };

  return (
    <section className="space-y-6 animate-fadeIn">
      <SectionHeader
        icon="📝"
        title="Novedades del curso"
        description="Mantente al día con las últimas actualizaciones"
      />

      {isProfessor && (
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-blue-900/50 to-blue-950/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-blue-800/50">
          <label htmlFor="novedad" className="block text-sm font-medium mb-3 text-blue-200">
            ¿Qué novedades deseas compartir con tus alumnos?
          </label>
          <textarea
            id="novedad"
            className="w-full p-3 sm:p-4 rounded-xl text-white bg-black/30 border border-blue-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-sm sm:text-base"
            rows={4}
            placeholder="Escribe una nueva novedad..."
            value={nuevaNovedad}
            onChange={(e) => setNuevaNovedad(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !nuevaNovedad.trim()}
            className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            <span>📤</span> {isSubmitting ? 'Publicando...' : 'Publicar novedad'}
          </button>
        </form>
      )}

      {novedades.length === 0 ? (
        <EmptyState icon="📭" message="Aún no se ha publicado ninguna novedad" />
      ) : (
        <div className="space-y-4">
          {novedades.map((n) => (
            <div
              key={n.id}
              className="bg-white/95 text-gray-900 rounded-2xl p-4 sm:p-6 shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-all"
            >
              <p className="text-sm sm:text-base leading-relaxed mb-3 break-words">{n.contenido}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>🕒</span>
                <span>
                  {new Date(n.createdAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
const ContratoEstudiante = ({ contratos, onSubirContrato, onEliminarContrato }) => {
  const [archivo, setArchivo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!archivo) {  // ✅ Validación agregada
    alert('❌ Por favor selecciona un archivo');
    return;
  }
  setIsUploading(true);
  console.log('📤 Enviando contrato...', archivo.name);  // ✅ Log
  const result = await onSubirContrato(archivo);
  if (result.success) {
    setArchivo(null);
    e.target.reset();
    alert('✅ Contrato subido exitosamente');
  } else {
    console.error('❌ Error al subir:', result.error);  // ✅ Log de error
    alert(`❌ ${result.error || 'Error al subir el contrato'}`);  // ✅ Mensaje mejorado
  }
  setIsUploading(false);
};

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este contrato?')) return;
    const success = await onEliminarContrato(id);
    alert(success ? '✅ Contrato eliminado' : '❌ Error al eliminar');
  };

  if (contratos.length === 0) {
    return (
      <form onSubmit={handleSubmit} className="bg-gradient-to-br from-blue-900/50 to-blue-950/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl border border-blue-800/50">
        <div className="text-center mb-6">
          <div className="text-4xl sm:text-6xl mb-4">📤</div>
          <p className="text-gray-300 text-sm sm:text-base px-4">
            Aún no has subido un contrato. Adjunta tu archivo PDF aquí para enviarlo a revisión.
          </p>
        </div>
        <div className="space-y-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setArchivo(e.target.files[0])}
            disabled={isUploading}
            className="block w-full text-xs sm:text-sm text-white file:mr-4 file:py-2 sm:file:py-3 file:px-4 sm:file:px-6 file:rounded-xl file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer disabled:opacity-50 cursor-pointer"
          />
          {archivo && (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-green-300 flex items-start gap-2 break-all">
                <span className="flex-shrink-0">✓</span>
                <span>
                  <strong>{archivo.name}</strong> ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </p>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isUploading || !archivo}
          className="mt-6 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm sm:text-lg"
        >
          {isUploading ? (
            <>
              <span className="animate-spin text-xl sm:text-2xl">⏳</span>
              <span>Subiendo...</span>
            </>
          ) : (
            <>
              <span>✅</span>
              <span>Subir contrato</span>
            </>
          )}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {contratos.map((c) => (
        <div
          key={c.id}
          className="bg-white/95 text-gray-900 p-4 sm:p-6 rounded-2xl shadow-xl space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl">📄</span>
              <a
                href={c.archivo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-semibold underline text-sm sm:text-base break-all"
              >
                Ver contrato
              </a>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl">📌</span>
              <span className="font-medium text-sm sm:text-base">Estado:</span>
              <span
                className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                  c.estado === 'ACEPTADO'
                    ? 'bg-green-100 text-green-700'
                    : c.estado === 'RECHAZADO'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {c.estado}
              </span>
            </div>

            {c.comentario && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-xs sm:text-sm break-words">
                  <strong>💬 Comentario:</strong> {c.comentario}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => handleEliminar(c.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-5 py-2 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm sm:text-base"
          >
            <span>🗑️</span> Eliminar contrato
          </button>
        </div>
      ))}
    </div>
  );
};

const ContratoProfesor = ({ contratos, onActualizarContrato }) => {
  const handleActualizar = async (contratoId, estado, comentario = '') => {
    const success = await onActualizarContrato(contratoId, estado, comentario);
    if (!success) alert('❌ Error al actualizar el contrato');
  };

  if (contratos.length === 0) {
    return (
      <EmptyState
        icon="📭"
        message="Aun no hay contratos enviados por los estudiantes"
      />
    );
  }

  return (
    <div className="space-y-4">
      {contratos.map((c) => (
        <div
          key={c.id}
          className="bg-white/95 text-gray-900 p-4 sm:p-6 rounded-2xl shadow-xl space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg">
              <span>👤</span>
              <span className="font-bold truncate">
                {c.alumno?.name || 'Sin nombre'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl">📄</span>
              <a
                href={c.archivo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-semibold underline text-sm sm:text-base break-all"
              >
                Ver contrato
              </a>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl">📌</span>
              <span className="font-medium text-sm sm:text-base">Estado:</span>
              <span
                className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                  c.estado === 'ACEPTADO'
                    ? 'bg-green-100 text-green-700'
                    : c.estado === 'RECHAZADO'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {c.estado}
              </span>
            </div>

            {c.comentario && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-xs sm:text-sm break-words">
                  <strong>💬 Comentario:</strong> {c.comentario}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-3 border-t">
            <button
              onClick={() => handleActualizar(c.id, 'ACEPTADO')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <span>✅</span> Aceptar
            </button>

            <button
              onClick={() => handleActualizar(c.id, 'RECHAZADO')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-5 py-2 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <span>❌</span> Rechazar
            </button>

            <button
              onClick={() => {
                const comentario = prompt('Ingresa el comentario o fecha limite:');
                if (comentario) handleActualizar(c.id, 'PENDIENTE', comentario);
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 sm:px-5 py-2 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <span>📅</span> Dar fecha limite
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const InformeEstudiante = ({ informes, onSubirInforme, onEliminarInforme }) => {
  const [archivo, setArchivo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!archivo) {  // ✅ Validación
    alert('❌ Por favor selecciona un archivo');
    return;
  }
  setIsUploading(true);
  console.log('📤 Enviando informe...', archivo.name);  // ✅ Log
  const result = await onSubirInforme(archivo);
  if (result.success) {
    setArchivo(null);
    e.target.reset();
    alert('✅ Informe subido exitosamente');
  } else {
    console.error('❌ Error al subir:', result.error);  // ✅ Log
    alert(`❌ ${result.error || 'Error al subir el informe'}`);  // ✅ Mensaje mejorado
  }
  setIsUploading(false);
};

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este informe?')) return;
    const success = await onEliminarInforme(id);
    alert(success ? '✅ Informe eliminado' : '❌ Error al eliminar');
  };

  if (informes.length === 0) {
    return (
      <form onSubmit={handleSubmit} className="bg-gradient-to-br from-purple-900/50 to-purple-950/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl border border-purple-800/50">
        <div className="text-center mb-6">
          <div className="text-4xl sm:text-6xl mb-4">✍️</div>
          <p className="text-gray-300 text-sm sm:text-base px-4">
            Aún no has subido tu informe final. Adjunta tu archivo PDF aquí para enviarlo a revisión.
          </p>
        </div>
        <div className="space-y-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setArchivo(e.target.files[0])}
            disabled={isUploading}
            className="block w-full text-xs sm:text-sm text-white file:mr-4 file:py-2 sm:file:py-3 file:px-4 sm:file:px-6 file:rounded-xl file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer disabled:opacity-50 cursor-pointer"
          />
          {archivo && (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-green-300 flex items-start gap-2 break-all">
                <span className="flex-shrink-0">✓</span>
                <span>
                  <strong>{archivo.name}</strong> ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </p>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isUploading || !archivo}
          className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm sm:text-lg"
        >
          {isUploading ? (
            <>
              <span className="animate-spin text-xl sm:text-2xl">⏳</span>
              <span>Subiendo...</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>Subir informe</span>
            </>
          )}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {informes.map((inf) => (
        <div key={inf.id} className="bg-white/95 text-gray-900 p-4 sm:p-6 rounded-2xl shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl">📄</span>
              <a
                href={inf.archivo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 font-semibold underline text-sm sm:text-base break-all"
              >
                Ver informe
              </a>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl">📌</span>
              <span className="font-medium text-sm sm:text-base">Estado:</span>
              <span
                className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                  inf.estado === 'ACEPTADO'
                    ? 'bg-green-100 text-green-700'
                    : inf.estado === 'RECHAZADO'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {inf.estado}
              </span>
            </div>
            {inf.feedback && (
              <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
                <p className="text-xs sm:text-sm break-words">
                  <strong>💬 Feedback del profesor:</strong> {inf.feedback}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => handleEliminar(inf.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-5 py-2 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm sm:text-base"
          >
            <span>🗑️</span> Eliminar informe
          </button>
        </div>
      ))}
    </div>
  );
};

const InformeProfesor = ({ informes, onActualizarInforme }) => {
  const handleActualizar = async (informeId, estado, feedback = '') => {
    const success = await onActualizarInforme(informeId, estado, feedback);
    if (!success) alert('❌ Error al actualizar el informe');
  };

  if (informes.length === 0) {
    return <EmptyState icon="📭" message="Aún no hay informes enviados por los estudiantes" />;
  }

  return (
    <div className="space-y-4">
      {informes.map((inf) => (
        <div key={inf.id} className="bg-white/95 text-gray-900 p-4 sm:p-6 rounded-2xl shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg">
              <span>👤</span>
              <span className="font-bold truncate">{inf.alumno?.name || 'Sin nombre'}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl">📄</span>
              <a
                href={inf.archivo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 font-semibold underline text-sm sm:text-base break-all"
              >
                Ver informe
              </a>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl">📌</span>
              <span className="font-medium text-sm sm:text-base">Estado:</span>
              <span
                className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                  inf.estado === 'ACEPTADO'
                    ? 'bg-green-100 text-green-700'
                    : inf.estado === 'RECHAZADO'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {inf.estado}
              </span>
            </div>
            {inf.feedback && (
              <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
                <p className="text-xs sm:text-sm break-words">
                  <strong>💬 Feedback:</strong> {inf.feedback}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-3 border-t">
            <button
              onClick={() => handleActualizar(inf.id, 'ACEPTADO')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <span>✅</span> Aceptar
            </button>
            <button
              onClick={() => handleActualizar(inf.id, 'RECHAZADO')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-5 py-2 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <span>❌</span> Rechazar
            </button>
            <button
              onClick={() => {
                const feedback = prompt('Ingresa el feedback para el estudiante:');
                if (feedback) handleActualizar(inf.id, 'PENDIENTE', feedback);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-5 py-2 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <span>📝</span> Dejar comentario
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const ContratosSection = ({ contratos, isStudent, onSubirContrato, onActualizarContrato, onEliminarContrato }) => (
  <section className="space-y-6 animate-fadeIn">
    <SectionHeader
      icon="📎"
      title="Gestión de Contratos"
      description="Sube y administra tus documentos"
      bgColor="from-green-500 to-emerald-600"
    />
    {isStudent ? (
      <ContratoEstudiante
        contratos={contratos}
        onSubirContrato={onSubirContrato}
        onEliminarContrato={onEliminarContrato}
      />
    ) : (
      <ContratoProfesor contratos={contratos} onActualizarContrato={onActualizarContrato} />
    )}
  </section>
);

const InformeSection = ({ informes, isStudent, onSubirInforme, onActualizarInforme, onEliminarInforme }) => (
  <section className="space-y-6 animate-fadeIn">
    <SectionHeader
      icon="📄"
      title="Informes de Prácticas"
      description="Gestiona tus informes finales"
      bgColor="from-purple-500 to-pink-600"
    />
    {isStudent ? (
      <InformeEstudiante
        informes={informes}
        onSubirInforme={onSubirInforme}
        onEliminarInforme={onEliminarInforme}
      />
    ) : (
      <InformeProfesor informes={informes} onActualizarInforme={onActualizarInforme} />
    )}
  </section>
);

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function CursoDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('novedades');

  const { curso, loading: cursoLoading } = useCursoData(id);
  const { novedades, crearNovedad } = useNovedades(id);
  
  // ✅ AGREGADO: Obtener email del usuario
  const alumnoEmail = session?.user?.email;
  
  // ✅ MODIFICADO: Pasar alumnoEmail a los hooks
  const {
    contratos,
    subirContrato,
    actualizarContrato,
    eliminarContrato,
  } = useContratos(id, alumnoEmail);
  
  const {
    informes,
    subirInforme,
    actualizarInforme,
    eliminarInforme,
  } = useInformes(id, alumnoEmail);

  const user = session?.user;
  const isProfessor = user?.role === 'PROFESSOR';
  const isStudent = user?.role === 'STUDENT';

  const tabs = [
    { id: 'novedades', icon: '📝', label: 'Novedades', shortLabel: 'Noved.' },
    { id: 'contrato', icon: '📎', label: 'Contrato', shortLabel: 'Contrato' },
    { id: 'informe', icon: '📄', label: 'Informe', shortLabel: 'Informe' },
  ];

  if (!session) return <UnauthorizedScreen />;
  if (cursoLoading || !curso) return <LoadingScreen message="Cargando curso..." />;

  // ✅ DEBUGGING: Ver en consola
  console.log('🔍 Session:', { email: alumnoEmail, role: user?.role });

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-black via-blue-950 to-black">
      <PageHeader curso={curso} onBack={() => router.push('/menu/ver-cursos')} />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Los componentes de sección permanecen IGUAL, 
            pero ahora los hooks ya tienen el alumnoEmail */}
        
        {activeTab === 'novedades' && (
          <NovedadesSection
            novedades={novedades}
            onCrearNovedad={crearNovedad}
            isProfessor={isProfessor}
          />
        )}

        {activeTab === 'contrato' && (
          <ContratosSection
            contratos={contratos}
            isStudent={isStudent}
            onSubirContrato={subirContrato}
            onActualizarContrato={actualizarContrato}
            onEliminarContrato={eliminarContrato}
          />
        )}

        {activeTab === 'informe' && (
          <InformeSection
            informes={informes}
            isStudent={isStudent}
            onSubirInforme={subirInforme}
            onActualizarInforme={actualizarInforme}
            onEliminarInforme={eliminarInforme}
          />
        )}
      </main>
    </div>
  );
}