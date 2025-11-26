import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request, context) {
  const params = await context.params; // 👈 Await params
  const id = params?.id;

  const novedades = await prisma.novedad.findMany({
    where: { cursoId: id },
    orderBy: { createdAt: 'desc' },
  });

  return new Response(JSON.stringify(novedades));
}

export async function POST(request, context) {
  const params = await context.params; // 👈 Await params
  const id = params?.id;
  const body = await request.json();

  const nuevaNovedad = await prisma.novedad.create({
    data: {
      contenido: body.contenido,
      cursoId: id,
    },
  });

  return new Response(JSON.stringify(nuevaNovedad));
}