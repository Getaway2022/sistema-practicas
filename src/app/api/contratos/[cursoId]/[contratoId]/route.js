import prisma from '@/lib/prisma'; // ✅ Usar el cliente singleton
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

export async function PUT(request, context) {
  try {
    const params = await context.params;
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
  } catch (error) {
    console.error('[API] Error al actualizar contrato:', error);
    return NextResponse.json(
      { error: 'Error al actualizar contrato' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const params = await context.params;
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
  } catch (error) {
    console.error('[API] Error al eliminar contrato:', error);
    return NextResponse.json(
      { error: 'Error al eliminar contrato' },
      { status: 500 }
    );
  }
}