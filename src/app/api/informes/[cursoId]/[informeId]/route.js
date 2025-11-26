import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import prisma from '../../../../../lib/prisma';

// PUT: Actualizar estado y feedback de un informe (solo profesores)
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { cursoId, informeId } = await params;
    const { estado, feedback } = await request.json();

    // Validar que el estado sea válido
    const estadosValidos = ['PENDIENTE', 'ACEPTADO', 'RECHAZADO'];
    if (estado && !estadosValidos.includes(estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    // Verificar que el informe pertenece al curso
    const informe = await prisma.informe.findUnique({
      where: { id: informeId },
    });

    if (!informe || informe.cursoId !== cursoId) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
    }

    // Verificar que el profesor es dueño del curso
    const curso = await prisma.curso.findUnique({
      where: { id: cursoId },
    });

    if (!curso || curso.profesorId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Actualizar el informe
    const informeActualizado = await prisma.informe.update({
      where: { id: informeId },
      data: {
        ...(estado && { estado }),
        ...(feedback !== undefined && { feedback }),
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
    console.error('Error al actualizar informe:', error);
    return NextResponse.json({ error: 'Error al actualizar informe' }, { status: 500 });
  }
}

// DELETE: Eliminar un informe (solo el estudiante que lo subió)
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { cursoId, informeId } = await params;

    // Buscar el informe
    const informe = await prisma.informe.findUnique({
      where: { id: informeId },
    });

    if (!informe || informe.cursoId !== cursoId) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
    }

    // Verificar que el estudiante es el dueño del informe
    if (session.user.role === 'STUDENT' && informe.alumnoId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Verificar que el profesor es dueño del curso (si es profesor)
    if (session.user.role === 'PROFESSOR') {
      const curso = await prisma.curso.findUnique({
        where: { id: cursoId },
      });

      if (!curso || curso.profesorId !== session.user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    // Eliminar el informe de la base de datos
    await prisma.informe.delete({
      where: { id: informeId },
    });

    return NextResponse.json({ message: 'Informe eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar informe:', error);
    return NextResponse.json({ error: 'Error al eliminar informe' }, { status: 500 });
  }
}