import { PrismaClient } from '@prisma/client';
import { put } from '@vercel/blob'; // 👈 Importa Vercel Blob
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req, context) {
  const params = await context.params;
  const cursoId = params?.cursoId;

  const contratos = await prisma.contrato.findMany({
    where: { cursoId },
    include: { alumno: true },
  });

  return new Response(JSON.stringify(contratos));
}

export async function POST(req, context) {
  const params = await context.params;
  const cursoId = params?.cursoId;

  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user || user.role !== 'STUDENT') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const alumno = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!alumno) {
    return new Response(JSON.stringify({ error: 'Alumno no encontrado' }), { status: 404 });
  }

  const formData = await req.formData();
  const archivo = formData.get('archivo');

  if (!archivo || typeof archivo === 'string') {
    return new Response(JSON.stringify({ error: 'Archivo no válido' }), {
      status: 400,
    });
  }

  // 👇 CAMBIO AQUÍ: Sube a Vercel Blob en lugar del sistema de archivos
  const blob = await put(archivo.name, archivo, {
    access: 'public',
  });

  // 👇 Guarda la URL del blob en lugar de la ruta local
  const contrato = await prisma.contrato.create({
    data: {
      archivo: blob.url, // 👈 URL completa de Vercel Blob
      estado: 'PENDIENTE',
      alumnoId: alumno.id,
      cursoId,
    },
  });

  return new Response(JSON.stringify(contrato));
}