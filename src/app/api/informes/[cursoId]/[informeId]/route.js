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
   console.log('[API] 📝 Actualizando informe:', { informeId, userRole: user?.role });
    if (!user || user.role !== 'PROFESSOR') {
      return NextResponse.json({ 
        success: false,
        error: 'No autorizado' 
      }, { status: 401 });
    }

    const body = await request.json();
    
    console.log('[API] 📦 Datos recibidos:', body);

    const informeActualizado = await prisma.informe.update({
      where: { id: informeId },
      data: {
        estado: body.estado || undefined,
        feedback: body.feedback || undefined, // 👈 Cambio de comentario a feedback
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
     console.log('[API] ✅ Informe actualizado');

    return NextResponse.json({
      success: true,
      data: informeActualizado
    });
  } catch (error) {
    console.error('[API] ❌ Error al actualizar informe:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar informe: ' + error.message 
      },
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

    console.log('[API] 🗑️ Eliminando informe:', { informeId, userEmail: user?.email });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ 
        success: false,
        error: 'No autorizado' 
      }, { status: 401 });
    }

    // Verificar que el informe pertenece al usuario
    const informe = await prisma.informe.findUnique({
      where: { id: informeId },
      include: { alumno: true },
    });

    if (!informe) {
      return NextResponse.json({ 
        success: false,
        error: 'Informe no encontrado' 
      }, { status: 404 });
    }

    if (informe.alumno.email !== user.email) {
      return NextResponse.json({ 
        success: false,
        error: 'No autorizado' 
      }, { status: 403 });
    }

    // Intentar eliminar archivo de Vercel Blob
    try {
      if (informe.archivo) {
        await del(informe.archivo);
        console.log('[API] ✅ Archivo eliminado de Vercel Blob');
      }
    } catch (blobError) {
      console.error('[API] ⚠️ Error al eliminar archivo de Blob:', blobError);
      // Continuar aunque falle la eliminación del archivo
    }

    await prisma.informe.delete({
      where: { id: informeId },
    });

    console.log('[API] ✅ Informe eliminado');

    return NextResponse.json({ 
      success: true,
      message: 'Informe eliminado correctamente'
    });
  } catch (error) {
    console.error('[API] ❌ Error al eliminar informe:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al eliminar informe: ' + error.message 
      },
      { status: 500 }
    );
  }
}