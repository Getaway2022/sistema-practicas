import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

// PUT: Actualizar estado/comentario de un informe (solo profesores)
export async function PUT(request, context) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    const user = session?.user;
    const { informeId } = params;

    if (!user || user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const informeActualizado = await prisma.informe.update({
      where: { id: informeId },
      data: {
        estado: body.estado || undefined,
        comentario: body.comentario || undefined,
      },
      include: {
        alumno: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(informeActualizado);
  } catch (error) {
    console.error('[API] Error al actualizar informe:', error);
    return NextResponse.json(
      { error: 'Error al actualizar informe' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un informe (solo el estudiante dueño)
export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    const user = session?.user;
    const { informeId } = params;

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el informe pertenece al usuario
    const informe = await prisma.informe.findUnique({
      where: { id: informeId },
      include: { alumno: true },
    });

    if (!informe || informe.alumno.email !== user.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.informe.delete({
      where: { id: informeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error al eliminar informe:', error);
    return NextResponse.json(
      { error: 'Error al eliminar informe' },
      { status: 500 }
    );
  }
}