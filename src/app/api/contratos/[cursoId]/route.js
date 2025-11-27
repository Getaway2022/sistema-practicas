import prisma from '@/lib/prisma'; // ✅ Usar el cliente singleton
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

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
    return errorResponse('Error al obtener contratos', 500);
  }
}

// ============================================
// POST - Crear contrato
// ============================================
export async function POST(req, context) {
  console.log('[API] 📝 Iniciando registro de contrato');

  try {
    const params = await context.params;
    const cursoId = params?.cursoId;

    const formData = await req.formData();
    const archivo = formData.get('archivo');
    const alumnoEmail = formData.get('alumnoEmail');

    console.log('[API] 📦 Datos recibidos:', { 
      cursoId,
      alumnoEmail,
      archivoNombre: archivo?.name,
      archivoTamaño: archivo?.size
    });

    // ============================================
    // VALIDACIONES
    // ============================================
    
    if (!alumnoEmail || !alumnoEmail.trim()) {
      console.log('[API] ❌ Email de alumno no proporcionado');
      return errorResponse('El email del alumno es obligatorio', 400);
    }

    if (!archivo || typeof archivo === 'string') {
      console.log('[API] ❌ Archivo no válido');
      return errorResponse('Archivo no válido', 400);
    }

    if (archivo.type !== 'application/pdf') {
      console.log('[API] ❌ Tipo de archivo inválido');
      return errorResponse('Solo se permiten archivos PDF', 400);
    }

    if (archivo.size > 10 * 1024 * 1024) {
      console.log('[API] ❌ Archivo muy grande');
      return errorResponse('El archivo no debe superar los 10MB', 400);
    }

    console.log('[API] ✅ Validación exitosa');

    // ============================================
    // BUSCAR O CREAR ALUMNO
    // ============================================
    
    let alumno = await prisma.user.findUnique({
      where: { email: alumnoEmail.trim() },
    });

    if (!alumno) {
      console.log('[API] 👤 Creando nuevo alumno:', alumnoEmail);
      
      alumno = await prisma.user.create({
        data: {
          email: alumnoEmail.trim(),
          name: alumnoEmail.split('@')[0],
          role: 'STUDENT',
          password: '',
        },
      });
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
        'Ya existe un contrato para este alumno en este curso',
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
    
    return errorResponse(
      'Error al crear contrato: ' + error.message,
      500
    );
  }
}