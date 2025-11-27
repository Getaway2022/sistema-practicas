// app/api/contratos/[cursoId]/[contratoId]route.js
import prisma from '@/lib/prisma'; // ✅ Usar el cliente singleton
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { del } from '@vercel/blob';

export async function PUT(request, context) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    const user = session?.user;
    const { contratoId } = params;
// ✅ Validar sesión
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // ✅ Solo profesores pueden actualizar
    if (user.role !== 'PROFESSOR') {
      return NextResponse.json({ 
        error: 'Solo los profesores pueden revisar contratos' 
      }, { status: 403 });
    }

    // ✅ Verificar que el contrato existe
    const contratoExistente = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: { 
        curso: true // Para verificar pertenencia
      }
    });

    if (!contratoExistente) {
      return NextResponse.json({ 
        error: 'Contrato no encontrado' 
      }, { status: 404 });
    }




    const body = await request.json();
  // ✅ Validar estados permitidos
    const estadosValidos = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];
    if (body.estado && !estadosValidos.includes(body.estado)) {
      return NextResponse.json({ 
        error: 'Estado no válido' 
      }, { status: 400 });
    }

    const contratoActualizado = await prisma.contrato.update({
      where: { id: contratoId },
      data: {
        estado: body.estado || undefined,
        comentario: body.comentario || undefined,
      },
      include: {
        alumno: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
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
     try {
      await del(contrato.archivo);
      console.log('✅ Archivo eliminado de Blob Storage');
    } catch (blobError) {
      console.error('⚠️ Error al eliminar de Blob:', blobError);
      // Continuar de todas formas para eliminar de BD
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