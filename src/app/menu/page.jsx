import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import OportunidadCard from "./OportunidadCard";
import MenuPageClient from "./MenuPageClient";
import prisma from '@/lib/prisma';

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================
const ROLE_LABELS = {
  ADMINISTRATIVE: "Administrador",
  STUDENT: "Estudiante",
  PROFESSOR: "Profesor",
};

const MENU_ITEMS = {
  registerOpportunity: {
    icon: "📝",
    title: "Registrar Oportunidad",
    subtitle: "Crear nueva publicación",
    href: "/menu/registrar-oportunidad",
    roles: ["ADMINISTRATIVE"],
  },
  viewCourses: {
    icon: "📚",
    title: "Ver Cursos",
    subtitle: "Explorar contenido académico",
    href: "/menu/ver-cursos",
    roles: ["STUDENT", "PROFESSOR"],
  },
  dashboard: {
    icon: "🏠",
    title: "Dashboard",
    subtitle: "Página principal",
    href: "/menu",
    roles: ["ADMINISTRATIVE", "STUDENT", "PROFESSOR"],
    isActive: true,
  },
};

// Componente: Acceso Denegado
const AccessDenied = () => (
  <div className="flex items-center justify-center min-h-screen 
                  bg-gradient-to-br from-gray-900 to-blue-900 px-4">
    <div className="bg-white/10 backdrop-blur-lg p-6 sm:p-8 rounded-2xl 
                    shadow-2xl border border-white/20 max-w-md w-full">
      <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
        🔒 Acceso Denegado
      </h2>
      <p className="text-gray-300 mt-2 text-center text-sm sm:text-base">
        Por favor inicia sesión
      </p>
      <Link href="/">
        <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white 
                          py-2 rounded-lg transition-colors">
          Ir al Login
        </button>
      </Link>
    </div>
  </div>
);

// ============================================
// COMPONENTE PRINCIPAL - Server Component
// ============================================
export default async function MenuPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return <AccessDenied />;
  }

  const oportunidades = await prisma.oportunidad.findMany({
    orderBy: { createdAt: "desc" },
    take: 9,
  });

  // Filtrar items del menú según el rol
  const filteredMenuItems = Object.values(MENU_ITEMS).filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <MenuPageClient 
      user={user}
      oportunidades={oportunidades}
      menuItems={filteredMenuItems}
      roleLabels={ROLE_LABELS}
    />
  );
}