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
  console.error('[API] Error Response:', { message, status, details });
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
  console.log('[API] 📋 Solicitando contratos');
  
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

    console.log(`[API] ✅ Retornando ${contratos.length} contratos`);
    
    return successResponse(
      contratos,
      'Contratos obtenidos correctamente'
    );

  } catch (error) {
    console.error('[API] ❌ Error al obtener contratos:', error);
    return errorResponse('Error al obtener contratos: ' + error.message, 500);
  }
}

// ============================================
// POST - Crear contrato
// ============================================
export async function POST(req, context) {
  console.log('[API] 📝 ====== INICIO POST CONTRATO ======');
  
  try {
    // 1. VERIFICAR VARIABLE DE ENTORNO
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[API] ❌ BLOB_READ_WRITE_TOKEN no está configurado');
      return errorResponse(
        'Error de configuración del servidor: BLOB_READ_WRITE_TOKEN no configurado',
        500,
        'Variable de entorno faltante'
      );
    }
    console.log('[API] ✅ BLOB_READ_WRITE_TOKEN está configurado');

    // 2. OBTENER SESIÓN
    const session = await getServerSession(authOptions);
    console.log('[API] 🔐 Sesión:', { 
      hasSession: !!session, 
      email: session?.user?.email,
      role: session?.user?.role 
    });

    if (!session?.user?.email) {
      console.log('[API] ❌ No hay sesión válida');
      return errorResponse('Debes iniciar sesión para subir contratos', 401);
    }

    // 3. OBTENER PARÁMETROS
    const params = await context.params;
    const cursoId = params?.cursoId;
    console.log('[API] 📦 CursoId:', cursoId);

    if (!cursoId) {
      return errorResponse('cursoId es requerido', 400);
    }

    // 4. OBTENER FORMDATA
    console.log('[API] 📄 Obteniendo FormData...');
    const formData = await req.formData();
    const archivo = formData.get('archivo');
    
    const alumnoEmail = session.user.email;

    console.log('[API] 📦 Datos recibidos:', { 
      cursoId,
      alumnoEmail,
      archivoNombre: archivo?.name,
      archivoTamaño: archivo?.size,
      archivoTipo: archivo?.type
    });

    // 5. VALIDACIONES DEL ARCHIVO
    if (!archivo) {
      console.log('[API] ❌ No se proporcionó archivo');
      return errorResponse('No se proporcionó archivo', 400);
    }

    if (typeof archivo === 'string') {
      console.log('[API] ❌ El archivo no es un File válido');
      return errorResponse('El archivo no es válido', 400);
    }

    if (archivo.type !== 'application/pdf') {
      console.log('[API] ❌ Tipo de archivo inválido:', archivo.type);
      return errorResponse('Solo se permiten archivos PDF', 400);
    }

    if (archivo.size > 10 * 1024 * 1024) {
      console.log('[API] ❌ Archivo muy grande:', archivo.size);
      return errorResponse('El archivo no debe superar los 10MB', 400);
    }

    console.log('[API] ✅ Validaciones exitosas');

    // 6. BUSCAR ALUMNO
    console.log('[API] 🔍 Buscando alumno...');
    const alumno = await prisma.user.findUnique({
      where: { email: alumnoEmail },
    });

    if (!alumno) {
      console.log('[API] ❌ Usuario no encontrado:', alumnoEmail);
      return errorResponse(
        'Usuario no encontrado. Asegúrate de haber iniciado sesión correctamente.',
        404
      );
    }

    console.log('[API] ✅ Alumno encontrado. ID:', alumno.id);

    // 7. VERIFICAR DUPLICADOS
    console.log('[API] 🔍 Verificando duplicados...');
    const contratoExistente = await prisma.contrato.findFirst({
      where: {
        cursoId,
        alumnoId: alumno.id,
      },
    });

    if (contratoExistente) {
      console.log('[API] ⚠️ Ya existe un contrato para este alumno');
      return errorResponse(
        'Ya existe un contrato para este alumno en este curso. Elimina el anterior antes de subir uno nuevo.',
        400
      );
    }

    // 8. SUBIR A VERCEL BLOB
    console.log('[API] 📤 Iniciando subida a Vercel Blob...');
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${alumno.id}_${archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    console.log('[API] 📝 Nombre del archivo:', fileName);

    let blob;
    try {
      blob = await put(`contratos/${fileName}`, archivo, {
        access: 'public',
      });
      console.log('[API] ✅ Archivo subido exitosamente. URL:', blob.url);
    } catch (blobError) {
      console.error('[API] ❌ Error al subir a Vercel Blob:', blobError);
      console.error('[API] Detalles del error:', {
        name: blobError.name,
        message: blobError.message,
        stack: blobError.stack
      });
      return errorResponse(
        'Error al subir el archivo. Por favor, intenta nuevamente.',
        500,
        blobError.message
      );
    }

    // 9. CREAR CONTRATO EN BD
    console.log('[API] 💾 Insertando en base de datos...');

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

    console.log('[API] ✅ Contrato registrado exitosamente. ID:', contrato.id);
    console.log('[API] 📝 ====== FIN POST CONTRATO (ÉXITO) ======');

    return successResponse(
      contrato,
      '✅ Contrato registrado correctamente',
      201
    );

  } catch (error) {
    console.error('[API] ❌ ====== ERROR CRÍTICO ======');
    console.error('[API] Error:', error);
    console.error('[API] Nombre:', error.name);
    console.error('[API] Mensaje:', error.message);
    console.error('[API] Stack:', error.stack);
    
    return errorResponse(
      'Error al procesar el contrato: ' + error.message,
      500,
      {
        name: error.name,
        message: error.message
      }
    );
  }
}

// ============================================
// DELETE - Eliminar contrato
// ============================================
export async function DELETE(req, context) {
  console.log('[API] 🗑️ Eliminando contrato');

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return errorResponse('Debes iniciar sesión', 401);
    }

    const params = await context.params;
    const cursoId = params?.cursoId;
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get('contratoId');

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

    if (alumno?.id !== contrato.alumnoId && session.user.role !== 'PROFESSOR' && session.user.role !== 'ADMINISTRATIVE') {
      return errorResponse('No tienes permisos para eliminar este contrato', 403);
    }

    try {
      await del(contrato.archivo);
      console.log('[API] ✅ Archivo eliminado de Vercel Blob');
    } catch (blobError) {
      console.error('[API] ⚠️ Error al eliminar archivo de Blob:', blobError);
    }

    await prisma.contrato.delete({
      where: { id: contratoId }
    });

    console.log('[API] ✅ Contrato eliminado de BD');

    return successResponse(null, 'Contrato eliminado correctamente');

  } catch (error) {
    console.error('[API] ❌ Error al eliminar contrato:', error);
    return errorResponse('Error al eliminar contrato: ' + error.message, 500);
  }
}