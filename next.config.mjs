/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de imágenes
  images: {
    domains: [
      'localhost',
      // Agrega aquí dominios externos si usas imágenes de otras fuentes
      'res.cloudinary.com',
      'avatars.githubusercontent.com',
    ],
    unoptimized: false,
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Redirecciones útiles
  async redirects() {
    return [
      // Redirigir raíz a login si no hay sesión
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ];
  },

  // Optimizaciones de Webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Evitar incluir módulos de servidor en el cliente
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },

  // Configuración experimental (opcional)
  experimental: {
    // Mejora el performance
    optimizeCss: true,
  },
};

export default nextConfig;