

import prisma from '@/lib/prisma';

export async function GET(request, context) {
  const params = await context.params; // 👈 Await params
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
      status: 400,
    });
  }

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: {
      profesor: true,
      contratos: true,
      informes: true,
    },
  });

  if (!curso) {
    return new Response(JSON.stringify({ error: 'Curso no encontrado' }), {
      status: 404,
    });
  }

  return new Response(JSON.stringify(curso), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}