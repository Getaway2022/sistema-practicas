import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PUT(request, context) {
  const params = await context.params; // 👈 Await params
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const { contratoId } = params;

  if (!user || user.role !== 'PROFESSOR') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();

  const contratoActualizado = await prisma.contrato.update({
    where: { id: contratoId },
    data: {
      estado: body.estado || undefined,
      comentario: body.comentario || undefined,
    },
  });

  return NextResponse.json(contratoActualizado);
}

export async function DELETE(request, context) {
  const params = await context.params; // 👈 Await params
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const { contratoId } = params;

  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verificar que el contrato pertenece al usuario
  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: { alumno: true },
  });

  if (!contrato || contrato.alumno.email !== user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  await prisma.contrato.delete({
    where: { id: contratoId },
  });

  return NextResponse.json({ success: true });
}