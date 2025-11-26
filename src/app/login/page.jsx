'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================
// CUSTOM HOOK - Patrón: Separation of Concerns
// ============================================
const useLogin = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.ok) {
        router.push('/menu');
      } else {
        setError('Correo o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isLoading,
    handleLogin,
  };
};

// ============================================
// COMPONENTE PRESENTACIONAL - Input Field
// Patrón: Component Composition
// ============================================
const InputField = ({ type, placeholder, value, onChange, icon }) => {
  return (
    <div className="relative w-full mb-4">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className="w-full px-4 py-3 pl-10 bg-white border border-gray-300 rounded-lg 
                   text-gray-900 placeholder-gray-500
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   transition-all duration-200"
      />
    </div>
  );
};

// ============================================
// COMPONENTE PRESENTACIONAL - Error Message
// ============================================
const ErrorMessage = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-600 text-sm flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        {message}
      </p>
    </div>
  );
};

// ============================================
// COMPONENTE PRESENTACIONAL - Loading Spinner
// ============================================
const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// ============================================
// COMPONENTE PRINCIPAL - Container Component
// Patrón: Container/Presentational
// ============================================
export default function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isLoading,
    handleLogin,
  } = useLogin();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen 
                    bg-gradient-to-br from-blue-900 via-blue-800 to-black
                    px-4 sm:px-6 lg:px-8">
      
      {/* Header - Responsive */}
      <div className="text-center mb-8">
        <h1 className="text-white text-3xl sm:text-4xl lg:text-5xl mb-2 font-bold 
                       drop-shadow-lg">
          Iniciar Sesión
        </h1>
        <p className="text-blue-200 text-sm sm:text-base">
          Accede a tu sistema de información
        </p>
      </div>

      {/* Form Container - Responsive */}
      <form 
        onSubmit={handleLogin} 
        className="bg-white/95 backdrop-blur-sm p-6 sm:p-8 lg:p-10 
                   rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md
                   transform transition-all duration-300"
      >
        
        {/* Email Input */}
        <InputField
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          }
        />

        {/* Password Input */}
        <InputField
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          }
        />

        {/* Error Message */}
        <ErrorMessage message={error} />

        {/* Submit Button - Responsive */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 
                     text-white py-3 rounded-lg font-semibold
                     hover:from-blue-700 hover:to-blue-800 
                     focus:outline-none focus:ring-4 focus:ring-blue-500/50
                     transform transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2
                     shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              <span>Ingresando...</span>
            </>
          ) : (
            'Ingresar'
          )}
        </button>
      </form>

      {/* Footer - Responsive */}
      <p className="text-blue-100 text-xs sm:text-sm mt-6 sm:mt-8 text-center px-4">
        Diseño de Sistemas de Información © 2025
      </p>

      {/* Decorative Elements - Hidden on mobile */}
      <div className="hidden lg:block absolute top-10 right-10 w-32 h-32 
                      bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="hidden lg:block absolute bottom-10 left-10 w-40 h-40 
                      bg-purple-500/10 rounded-full blur-3xl"></div>
    </div>
  );
}