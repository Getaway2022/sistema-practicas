import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { PrismaClient } from "@prisma/client";
import VerCursosClient from "./VerCursosClient";

const prisma = new PrismaClient();

/**
 * VerCursosPage - Server Component (Wrapper)
 * Maneja la autenticación y fetch de datos en el servidor
 * Pasa los datos al Client Component para la interactividad
 */
export default async function VerCursosPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  // Fetch de cursos solo si hay usuario autenticado
  const cursos = user ? await prisma.curso.findMany({
    orderBy: { nombre: 'asc' }
  }) : [];

  return <VerCursosClient user={user} cursos={cursos} />;
}