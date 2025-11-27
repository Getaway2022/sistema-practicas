import prisma from '@/lib/prisma';
import { put, del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// ============================================
// HELPERS DE RESPUESTA
// ============================================

function successResponse(data, message = 'Operación exitosa', status = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data
    },
    { status }
  );
}

function errorResponse(message, status = 400, details = null) {
  console.error('[API CONTRATOS] Error Response:', { message, status, details });
  return NextResponse.json(
    {
      success: false,
      error: message,
      message,
      ...(details && { details })
    },
    { status }
  );
}
// ============================================
// GET - Obtener contratos
// ============================================
export async function GET(req, context) {
  console.log('[API CONTRATOS] 📋 GET - Iniciando');
  
  try {
    const params = await context.params;
    const cursoId = params?.cursoId;

    if (!cursoId) {
      return errorResponse('cursoId es requerido', 400);
    }

    const contratos = await prisma.contrato.findMany({
      where: { cursoId },
      include: { 
        alumno: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

   console.log(`[API CONTRATOS] ✅ Retornando ${contratos.length} contratos`);
    
    return new Response(JSON.stringify(contratos), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API CONTRATOS] ❌ Error GET:', error);
    return NextResponse.json({ 
      error: 'Error al obtener contratos: ' + error.message 
    }, { status: 500 });
  }
}

// ============================================
// POST - Crear contrato
// ============================================
export async function POST(req, context) {
  console.log('[API CONTRATOS] 📝 POST - Iniciando');

  try {
    const params = await context.params;
    const cursoId = params?.cursoId;

    if (!cursoId) {
      return NextResponse.json({ error: 'cursoId requerido' }, { status: 400 });
    }

    const formData = await req.formData();
    const archivo = formData.get('archivo');
    const alumnoEmail = formData.get('alumnoEmail');

    console.log('[API CONTRATOS] 📦 Datos recibidos:', { 
      cursoId,
      alumnoEmail,
      archivoNombre: archivo?.name,
      archivoTamaño: archivo?.size,
      archivoTipo: archivo?.type
    });

    if (!alumnoEmail || !alumnoEmail.trim()) {
      console.log('[API CONTRATOS] ❌ Email no proporcionado');
      return NextResponse.json({ 
        error: 'El email del alumno es obligatorio' 
      }, { status: 400 });
    }

    if (!archivo || typeof archivo === 'string') {
      console.log('[API CONTRATOS] ❌ Archivo no válido');
      return NextResponse.json({ 
        error: 'Debes seleccionar un archivo PDF' 
      }, { status: 400 });
    }

    if (archivo.type !== 'application/pdf') {
      console.log('[API CONTRATOS] ❌ Tipo de archivo inválido:', archivo.type);
      return NextResponse.json({ 
        error: 'Solo se permiten archivos PDF' 
      }, { status: 400 });
    }

    if (archivo.size > 10 * 1024 * 1024) {
      console.log('[API CONTRATOS] ❌ Archivo muy grande:', archivo.size);
      return NextResponse.json({ 
        error: 'El archivo no debe superar los 10MB' 
      }, { status: 400 });
    }

    console.log('[API CONTRATOS] ✅ Validaciones pasadas');

    let alumno = await prisma.user.findUnique({
      where: { email: alumnoEmail.trim() },
    });

    if (!alumno) {
      console.log('[API CONTRATOS] 👤 Creando nuevo alumno:', alumnoEmail);
      
      alumno = await prisma.user.create({
        data: {
          email: alumnoEmail.trim(),
          name: alumnoEmail.split('@')[0],
          role: 'STUDENT',
          password: '',
        },
      });
    }

    console.log('[API CONTRATOS] ✅ Alumno identificado. ID:', alumno.id);

    const contratoExistente = await prisma.contrato.findFirst({
      where: {
        cursoId,
        alumnoId: alumno.id,
      },
    });

    if (contratoExistente) {
      console.log('[API CONTRATOS] ⚠️ Ya existe un contrato');
      return NextResponse.json({ 
        error: 'Ya existe un contrato para este alumno en este curso. Elimina el anterior antes de subir uno nuevo.' 
      }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[API CONTRATOS] ❌ BLOB_READ_WRITE_TOKEN no configurado');
      return NextResponse.json({ 
        error: 'Error de configuración del servidor. Contacta al administrador.' 
      }, { status: 500 });
    }

    console.log('[API CONTRATOS] 📤 Subiendo archivo a Vercel Blob...');
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${alumno.id}_${archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    let blob;
    try {
      blob = await put(`contratos/${fileName}`, archivo, {
        access: 'public',
      });
      console.log('[API CONTRATOS] ✅ Archivo subido a Blob. URL:', blob.url);
    } catch (blobError) {
      console.error('[API CONTRATOS] ❌ Error al subir a Vercel Blob:', blobError);
      return NextResponse.json({ 
        error: 'Error al subir el archivo. Intenta nuevamente.' 
      }, { status: 500 });
    }

    console.log('[API CONTRATOS] 💾 Insertando en BD...');

    const contrato = await prisma.contrato.create({
      data: {
        archivo: blob.url,
        estado: 'PENDIENTE',
        alumnoId: alumno.id,
        cursoId,
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

    console.log('[API CONTRATOS] ✅ Contrato registrado exitosamente. ID:', contrato.id);

    return new Response(JSON.stringify(contrato), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API CONTRATOS] ❌ ERROR CRÍTICO al crear contrato');
    console.error('[API CONTRATOS] Tipo:', error.name);
    console.error('[API CONTRATOS] Mensaje:', error.message);
    console.error('[API CONTRATOS] Stack:', error.stack);
    
    return NextResponse.json({ 
      error: 'Error al procesar el contrato: ' + error.message 
    }, { status: 500 });
  }
}

// ============================================
// DELETE - Eliminar contrato
// ============================================
export async function DELETE(request, { params }) {
  console.log('[API INFORMES] 🗑️ DELETE - Iniciando');

  try {
    const { cursoId } = await params;
    const { searchParams } = new URL(request.url);
    const informeId = searchParams.get('informeId');

    console.log('[API INFORMES] InformeId:', informeId);

    if (!informeId) {
      return NextResponse.json({ 
        error: 'informeId es requerido' 
      }, { status: 400 });
    }

    // Buscar el informe
    const informe = await prisma.informe.findUnique({
      where: { id: informeId },
      include: { alumno: true }
    });

    if (!informe) {
      return NextResponse.json({ 
        error: 'Informe no encontrado' 
      }, { status: 404 });
    }

    // Eliminar de Vercel Blob
    try {
      const { del } = await import('@vercel/blob');
      await del(informe.archivo);
      console.log('[API INFORMES] ✅ Archivo eliminado de Blob');
    } catch (blobError) {
      console.error('[API INFORMES] ⚠️ Error al eliminar de Blob:', blobError);
      // Continuar aunque falle la eliminación del blob
    }

    // Eliminar de la base de datos
    await prisma.informe.delete({
      where: { id: informeId }
    });

    console.log('[API INFORMES] ✅ Informe eliminado de BD');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Informe eliminado correctamente' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API INFORMES] ❌ Error DELETE:', error);
    return NextResponse.json({ 
      error: 'Error al eliminar: ' + error.message 
    }, { status: 500 });
  }
}