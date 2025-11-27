// app/api/informes/[cursoId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';

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
// GET - Obtener informes
// ============================================
export async function GET(request, { params }) {
  console.log('[API] 📋 Solicitando informes');
  
  try {
    const { cursoId } = await params;

    const informes = await prisma.informe.findMany({
      where: { cursoId },
      include: {
        alumno: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`[API] ✅ Retornando ${informes.length} informes`);
    
    return successResponse(
      informes,
      'Informes obtenidos correctamente'
    );

  } catch (error) {
    console.error('[API] ❌ Error al obtener informes:', error);
    return errorResponse('Error al obtener informes', 500);
  }
}

// ============================================
// POST - Crear informe (SIN AUTENTICACIÓN)
// ============================================
export async function POST(request, { params }) {
  console.log('[API] 📝 Iniciando registro de informe');

  try {
    const { cursoId } = await params;
    const formData = await request.formData();
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

    if (!archivo) {
      console.log('[API] ❌ Archivo no proporcionado');
      return errorResponse('No se proporcionó archivo', 400);
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
    
    const informeExistente = await prisma.informe.findFirst({
      where: {
        cursoId,
        alumnoId: alumno.id,
      },
    });

    if (informeExistente) {
      console.log('[API] ⚠️ Ya existe un informe para este alumno');
      return errorResponse(
        'Ya tienes un informe subido para este curso',
        400
      );
    }

    // ============================================
    // SUBIR A VERCEL BLOB
    // ============================================
    
    console.log('[API] 📤 Subiendo archivo a Vercel Blob...');
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${alumno.id}_${archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const blob = await put(`informes/${fileName}`, archivo, {
      access: 'public',
    });

    console.log('[API] ✅ Archivo subido. URL:', blob.url);

    // ============================================
    // CREAR INFORME EN BD
    // ============================================
    
    console.log('[API] 💾 Insertando en BD...');

    const nuevoInforme = await prisma.informe.create({
      data: {
        cursoId,
        alumnoId: alumno.id,
        archivo: blob.url,
        estado: 'PENDIENTE',
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

    console.log('[API] ✅ Informe registrado. ID:', nuevoInforme.id);

    return successResponse(
      nuevoInforme,
      '✅ Informe registrado correctamente',
      201
    );

  } catch (error) {
    console.error('[API] ❌ Error al crear informe:', error);
    
    return errorResponse(
      'Error al crear informe: ' + error.message,
      500
    );
  }
}