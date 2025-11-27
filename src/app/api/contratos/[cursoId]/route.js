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

    console.log('[API CONTRATOS] CursoId:', cursoId);

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
        },
        curso: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[API CONTRATOS] ✅ Retornando ${contratos.length} contratos`);
    
    return successResponse(contratos, 'Contratos obtenidos correctamente');

  } catch (error) {
    console.error('[API CONTRATOS] ❌ Error GET:', error);
    console.error('[API CONTRATOS] Stack:', error.stack);
    return errorResponse('Error al obtener contratos: ' + error.message, 500);
  }
}

// ============================================
// POST - Crear contrato
// ============================================
export async function POST(req, context) {
  console.log('[API CONTRATOS] 📝 POST - Iniciando');
  
  try {
    // 1. SESIÓN
    const session = await getServerSession(authOptions);
    console.log('[API CONTRATOS] Sesión:', { 
      existe: !!session,
      email: session?.user?.email,
      role: session?.user?.role 
    });

    if (!session?.user?.email) {
      console.log('[API CONTRATOS] ❌ Sin sesión válida');
      return errorResponse('Debes iniciar sesión', 401);
    }

    // 2. PARÁMETROS
    const params = await context.params;
    const cursoId = params?.cursoId;
    console.log('[API CONTRATOS] CursoId:', cursoId);

    if (!cursoId) {
      return errorResponse('cursoId es requerido', 400);
    }

    // 3. FORMDATA
    console.log('[API CONTRATOS] Obteniendo FormData...');
    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error('[API CONTRATOS] ❌ Error al parsear FormData:', formError);
      return errorResponse('Error al procesar los datos del formulario', 400);
    }

    const archivo = formData.get('archivo');
    console.log('[API CONTRATOS] Archivo:', {
      existe: !!archivo,
      nombre: archivo?.name,
      tamaño: archivo?.size,
      tipo: archivo?.type
    });

    // 4. VALIDACIONES
    if (!archivo || typeof archivo === 'string') {
      return errorResponse('Debes seleccionar un archivo', 400);
    }

    if (archivo.type !== 'application/pdf') {
      return errorResponse('Solo se permiten archivos PDF', 400);
    }

    if (archivo.size > 10 * 1024 * 1024) {
      return errorResponse('El archivo no debe superar los 10MB', 400);
    }

    // 5. BUSCAR ALUMNO
    console.log('[API CONTRATOS] Buscando alumno...');
    const alumno = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!alumno) {
      console.log('[API CONTRATOS] ❌ Alumno no encontrado');
      return errorResponse('Usuario no encontrado', 404);
    }

    console.log('[API CONTRATOS] ✅ Alumno encontrado:', alumno.id);

    // 6. VERIFICAR DUPLICADOS
    const contratoExistente = await prisma.contrato.findFirst({
      where: {
        cursoId,
        alumnoId: alumno.id,
      },
    });

    if (contratoExistente) {
      console.log('[API CONTRATOS] ⚠️ Ya existe un contrato');
      return errorResponse(
        'Ya tienes un contrato para este curso. Elimina el anterior antes de subir uno nuevo.',
        400
      );
    }

    // 7. SUBIR A VERCEL BLOB
    console.log('[API CONTRATOS] Subiendo a Vercel Blob...');
    
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[API CONTRATOS] ❌ BLOB_READ_WRITE_TOKEN no configurado');
      return errorResponse('Error de configuración del servidor', 500);
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}_${alumno.id}_${archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    let blob;
    try {
      blob = await put(`contratos/${fileName}`, archivo, {
        access: 'public',
      });
      console.log('[API CONTRATOS] ✅ Archivo subido:', blob.url);
    } catch (blobError) {
      console.error('[API CONTRATOS] ❌ Error Vercel Blob:', blobError);
      return errorResponse(
        'Error al subir el archivo. Intenta nuevamente.',
        500,
        blobError.message
      );
    }

    // 8. CREAR EN BD
    console.log('[API CONTRATOS] Creando en BD...');
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
        curso: {
          select: {
            id: true,
            nombre: true,
          }
        }
      },
    });

    console.log('[API CONTRATOS] ✅ Contrato creado:', contrato.id);

    return successResponse(contrato, 'Contrato subido correctamente', 201);

  } catch (error) {
    console.error('[API CONTRATOS] ❌ ERROR CRÍTICO');
    console.error('[API CONTRATOS] Tipo:', error.name);
    console.error('[API CONTRATOS] Mensaje:', error.message);
    console.error('[API CONTRATOS] Stack:', error.stack);
    
    return errorResponse(
      'Error al procesar el contrato: ' + error.message,
      500,
      { name: error.name, message: error.message }
    );
  }
}

// ============================================
// DELETE - Eliminar contrato
// ============================================
export async function DELETE(req, context) {
  console.log('[API CONTRATOS] 🗑️ DELETE - Iniciando');

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return errorResponse('Debes iniciar sesión', 401);
    }

    const params = await context.params;
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get('contratoId');

    console.log('[API CONTRATOS] ContratoId:', contratoId);

    if (!contratoId) {
      return errorResponse('contratoId es requerido', 400);
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: { alumno: true }
    });

    if (!contrato) {
      return errorResponse('Contrato no encontrado', 404);
    }

    const alumno = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (alumno?.id !== contrato.alumnoId && 
        session.user.role !== 'PROFESSOR' && 
        session.user.role !== 'ADMINISTRATIVE') {
      return errorResponse('No tienes permisos', 403);
    }

    // Eliminar de Vercel Blob
    try {
      await del(contrato.archivo);
      console.log('[API CONTRATOS] ✅ Archivo eliminado de Blob');
    } catch (blobError) {
      console.error('[API CONTRATOS] ⚠️ Error al eliminar de Blob:', blobError);
    }

    await prisma.contrato.delete({
      where: { id: contratoId }
    });

    console.log('[API CONTRATOS] ✅ Contrato eliminado');

    return successResponse(null, 'Contrato eliminado correctamente');

  } catch (error) {
    console.error('[API CONTRATOS] ❌ Error DELETE:', error);
    return errorResponse('Error al eliminar: ' + error.message, 500);
  }
}