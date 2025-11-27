import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';
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

function errorResponse(message, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      message
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
  console.log('[API] 📝 Iniciando registro de contrato');

  try {
    // Obtener sesión del servidor
    const session = await getServerSession(authOptions);

    console.log('[API] 🔐 Sesión:', { 
      hasSession: !!session, 
      email: session?.user?.email,
      role: session?.user?.role 
    });

    // Validar sesión
    if (!session?.user?.email) {
      console.log('[API] ❌ No hay sesión válida');
      return errorResponse('Debes iniciar sesión para subir contratos', 401);
    }

    const params = await context.params;
    const cursoId = params?.cursoId;

    if (!cursoId) {
      return errorResponse('cursoId es requerido', 400);
    }

    const formData = await req.formData();
    const archivo = formData.get('archivo');
    
    // Usar email de la sesión del servidor
    const alumnoEmail = session.user.email;

    console.log('[API] 📦 Datos recibidos:', { 
      cursoId,
      alumnoEmail,
      archivoNombre: archivo?.name,
      archivoTamaño: archivo?.size
    });

    // ============================================
    // VALIDACIONES
    // ============================================
    
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

    console.log('[API] ✅ Validación exitosa');

    // ============================================
    // BUSCAR ALUMNO
    // ============================================
    
    const alumno = await prisma.user.findUnique({
      where: { email: alumnoEmail },
    });

    if (!alumno) {
      console.log('[API] ❌ Usuario no encontrado:', alumnoEmail);
      return errorResponse('Usuario no encontrado. Asegúrate de haber iniciado sesión correctamente.', 404);
    }

    console.log('[API] ✅ Alumno identificado. ID:', alumno.id);

    // ============================================
    // VERIFICAR DUPLICADOS
    // ============================================
    
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

    // ============================================
    // SUBIR A VERCEL BLOB
    // ============================================
    
    console.log('[API] 📤 Subiendo archivo a Vercel Blob...');
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${alumno.id}_${archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const blob = await put(`contratos/${fileName}`, archivo, {
      access: 'public',
    });

    console.log('[API] ✅ Archivo subido. URL:', blob.url);

    // ============================================
    // CREAR CONTRATO EN BD
    // ============================================
    
    console.log('[API] 💾 Insertando en BD...');

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

    console.log('[API] ✅ Contrato registrado. ID:', contrato.id);

    return successResponse(
      contrato,
      '✅ Contrato registrado correctamente',
      201
    );

  } catch (error) {
    console.error('[API] ❌ Error al crear contrato:', error);
    console.error('[API] Stack:', error.stack);
    
    return errorResponse(
      'Error al crear contrato: ' + error.message,
      500
    );
  }
}