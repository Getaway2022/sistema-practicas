'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================

const CONFIG = {
  defaultImage: '/images/default-oportunidad.jpg',
  maxTitleLength: 200,
  redirectDelay: 1500,
  endpoints: {
    oportunidades: '/api/oportunidades',
    menu: '/menu'
  }
};

const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Por favor completa todos los campos requeridos',
  DB_CONNECTION_ERROR: 'No hay conexión con el servidor. Intenta más tarde',
  DB_CONSTRAINT_ERROR: 'Error al guardar. Verifica los datos',
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet',
  UNKNOWN_ERROR: 'Error desconocido. Intenta nuevamente'
};

// ============================================
// CUSTOM HOOKS
// ============================================

const useOportunidadForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    imagen: ''
  });
  const [mensaje, setMensaje] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({ titulo: '', descripcion: '', imagen: '' });
    setMensaje(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje(null);

    try {
      const payload = {
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim(),
        // Solo enviar imagen si hay una, sino el backend usará la default
        ...(formData.imagen.trim() && { imagen: formData.imagen.trim() })
      };

      const res = await fetch(CONFIG.endpoints.oportunidades, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje({
          type: 'success',
          text: data.message || '✅ Oportunidad registrada correctamente'
        });

        resetForm();

        setTimeout(() => {
          router.push(CONFIG.endpoints.menu);
        }, CONFIG.redirectDelay);
      } else {
        const errorMessage = ERROR_MESSAGES[data.code] || data.message || ERROR_MESSAGES.UNKNOWN_ERROR;
        setMensaje({ type: 'error', text: `❌ ${errorMessage}` });
      }
    } catch (error) {
      console.error('Error de red:', error);
      setMensaje({
        type: 'error',
        text: `❌ ${ERROR_MESSAGES.NETWORK_ERROR}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, router, resetForm]);

  return {
    formData,
    updateField,
    mensaje,
    isLoading,
    handleSubmit,
    resetForm
  };
};

// ============================================
// COMPONENTES UI REUTILIZABLES
// ============================================

const BackButton = ({ onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="absolute top-3 left-3 sm:top-4 sm:left-4 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 group"
    title="Volver al menú"
    aria-label="Volver al menú"
  >
    <span className="text-xl sm:text-2xl group-hover:-translate-x-1 transition-transform">←</span>
    <span className="text-xs sm:text-sm font-medium">Volver</span>
  </button>
);

const FormHeader = ({ title }) => (
  <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-900 text-center pt-8 sm:pt-6">
    {title}
  </h2>
);

const InputField = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  disabled, 
  maxLength,
  required = false,
  className = ''
}) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    required={required}
    maxLength={maxLength}
    disabled={disabled}
    className={`w-full mb-3 p-2 sm:p-3 border rounded disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base ${className}`}
  />
);

const TextAreaField = ({ 
  placeholder, 
  value, 
  onChange, 
  disabled, 
  rows = 4,
  required = false 
}) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    required={required}
    rows={rows}
    disabled={disabled}
    className="w-full mb-3 p-2 sm:p-3 border rounded disabled:bg-gray-100 disabled:cursor-not-allowed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
  />
);

const ImagePreview = ({ src, onError }) => {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) return null;

  return (
    <div className="mb-3 animate-fadeIn">
      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
        <span>🖼️</span>
        <span>Vista previa:</span>
      </p>
      <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
        <img
          src={src}
          alt="Vista previa de la imagen"
          className="w-full h-40 sm:h-48 object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    </div>
  );
};

const SubmitButton = ({ isLoading, disabled, onClick }) => (
  <button
    type="submit"
    disabled={isLoading || disabled}
    onClick={onClick}
    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2.5 sm:py-3 rounded-lg font-medium disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
  >
    {isLoading ? (
      <>
        <span className="animate-spin text-lg sm:text-xl">⏳</span>
        <span>Publicando...</span>
      </>
    ) : (
      <>
        <span>✨</span>
        <span>Publicar Oportunidad</span>
      </>
    )}
  </button>
);

const AlertMessage = ({ mensaje }) => {
  if (!mensaje) return null;

  const isSuccess = mensaje.type === 'success';

  return (
    <div
      className={`mt-4 p-3 sm:p-4 rounded-lg text-center text-xs sm:text-sm font-medium animate-fadeIn ${
        isSuccess
          ? 'bg-green-50 text-green-800 border-2 border-green-300'
          : 'bg-red-50 text-red-800 border-2 border-red-300'
      }`}
      role="alert"
    >
      {mensaje.text}
    </div>
  );
};

const FormHint = () => (
  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-xs sm:text-sm text-blue-800 flex items-start gap-2">
      <span className="text-base flex-shrink-0">💡</span>
      <span>
        Si no proporcionas una imagen, se usará una imagen por defecto. 
        Puedes agregar la URL de una imagen después.
      </span>
    </p>
  </div>
);

const CharacterCounter = ({ current, max }) => (
  <div className="text-right mb-2">
    <span className={`text-xs ${current > max * 0.9 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
      {current} / {max} caracteres
    </span>
  </div>
);

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function RegistrarOportunidadPage() {
  const router = useRouter();
  const {
    formData,
    updateField,
    mensaje,
    isLoading,
    handleSubmit
  } = useOportunidadForm();

  const isFormValid = formData.titulo.trim() && formData.descripcion.trim();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black text-white p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg text-black relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
        
        <div className="p-6 sm:p-8">
          <BackButton
            onClick={() => router.push(CONFIG.endpoints.menu)}
            disabled={isLoading}
          />

          <FormHeader title="Registrar Nueva Oportunidad" />

          <FormHint />

          <form onSubmit={handleSubmit} className="space-y-1">
            {/* Título */}
            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <InputField
                type="text"
                placeholder="Ej: Desarrollador Frontend React"
                value={formData.titulo}
                onChange={(e) => updateField('titulo', e.target.value)}
                required
                maxLength={CONFIG.maxTitleLength}
                disabled={isLoading}
              />
              <CharacterCounter 
                current={formData.titulo.length} 
                max={CONFIG.maxTitleLength} 
              />
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción <span className="text-red-500">*</span>
              </label>
              <TextAreaField
                placeholder="Describe los requisitos, responsabilidades y beneficios..."
                value={formData.descripcion}
                onChange={(e) => updateField('descripcion', e.target.value)}
                required
                rows={5}
                disabled={isLoading}
              />
            </div>

            {/* Imagen (Opcional) */}
            <div>
              <label htmlFor="imagen" className="block text-sm font-medium text-gray-700 mb-1">
                URL de Imagen <span className="text-gray-400 text-xs">(Opcional)</span>
              </label>
              <InputField
                type="text"
                placeholder="https://ejemplo.com/imagen.jpg o /images/foto.jpg"
                value={formData.imagen}
                onChange={(e) => updateField('imagen', e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Vista previa de imagen */}
            {formData.imagen && <ImagePreview src={formData.imagen} />}

            {/* Botón de envío */}
            <div className="pt-2">
              <SubmitButton
                isLoading={isLoading}
                disabled={!isFormValid}
                onClick={handleSubmit}
              />
            </div>

            {/* Mensaje de estado */}
            <AlertMessage mensaje={mensaje} />
          </form>

          {/* Footer informativo */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Los campos marcados con <span className="text-red-500">*</span> son obligatorios
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}