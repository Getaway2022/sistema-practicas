// app/api/informes/[cursoId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';

// ============================================
// GET - Obtener informes (SIN AUTH)
// ============================================
export async function GET(request, { params }) {
  console.log('[API INFORMES] 📋 GET - Iniciando');
  
  try {
    const { cursoId } = await params;

    if (!cursoId) {
      return NextResponse.json({ error: 'cursoId requerido' }, { status: 400 });
    }

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

    console.log(`[API INFORMES] ✅ Retornando ${informes.length} informes`);
    
    // ✅ Respuesta simple como array directo (igual que novedades)
    return new Response(JSON.stringify(informes), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API INFORMES] ❌ Error GET:', error);
    return NextResponse.json({ 
      error: 'Error al obtener informes: ' + error.message 
    }, { status: 500 });
  }
}

// ============================================
// POST - Crear informe (SIN AUTH)
// ============================================
export async function POST(request, { params }) {
  console.log('[API INFORMES] 📝 POST - Iniciando');

  try {
    // 1. Obtener parámetros
    const { cursoId } = await params;

    if (!cursoId) {
      return NextResponse.json({ error: 'cursoId requerido' }, { status: 400 });
    }

    // 2. Obtener FormData
    const formData = await request.formData();
    const archivo = formData.get('archivo');
    const alumnoEmail = formData.get('alumnoEmail');

    console.log('[API INFORMES] 📦 Datos recibidos:', { 
      cursoId,
      alumnoEmail,
      archivoNombre: archivo?.name,
      archivoTamaño: archivo?.size,
      archivoTipo: archivo?.type
    });

    // 3. Validaciones
    if (!alumnoEmail || !alumnoEmail.trim()) {
      console.log('[API INFORMES] ❌ Email no proporcionado');
      return NextResponse.json({ 
        error: 'El email del alumno es obligatorio' 
      }, { status: 400 });
    }

    if (!archivo) {
      console.log('[API INFORMES] ❌ Archivo no proporcionado');
      return NextResponse.json({ 
        error: 'Debes seleccionar un archivo PDF' 
      }, { status: 400 });
    }

    if (archivo.type !== 'application/pdf') {
      console.log('[API INFORMES] ❌ Tipo de archivo inválido:', archivo.type);
      return NextResponse.json({ 
        error: 'Solo se permiten archivos PDF' 
      }, { status: 400 });
    }

    if (archivo.size > 10 * 1024 * 1024) {
      console.log('[API INFORMES] ❌ Archivo muy grande:', archivo.size);
      return NextResponse.json({ 
        error: 'El archivo no debe superar los 10MB' 
      }, { status: 400 });
    }

    console.log('[API INFORMES] ✅ Validaciones pasadas');

    // 4. Buscar o crear alumno
    let alumno = await prisma.user.findUnique({
      where: { email: alumnoEmail.trim() },
    });

    if (!alumno) {
      console.log('[API INFORMES] 👤 Creando nuevo alumno:', alumnoEmail);
      
      alumno = await prisma.user.create({
        data: {
          email: alumnoEmail.trim(),
          name: alumnoEmail.split('@')[0],
          role: 'STUDENT',
          password: '', // Sin password para usuarios creados externamente
        },
      });
    }

    console.log('[API INFORMES] ✅ Alumno identificado. ID:', alumno.id);

    // 5. Verificar si ya existe un informe
    const informeExistente = await prisma.informe.findFirst({
      where: {
        cursoId,
        alumnoId: alumno.id,
      },
    });

    if (informeExistente) {
      console.log('[API INFORMES] ⚠️ Ya existe un informe');
      return NextResponse.json({ 
        error: 'Ya existe un informe para este alumno en este curso. Elimina el anterior antes de subir uno nuevo.' 
      }, { status: 400 });
    }

    // 6. Verificar que BLOB_READ_WRITE_TOKEN esté configurado
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[API INFORMES] ❌ BLOB_READ_WRITE_TOKEN no configurado');
      return NextResponse.json({ 
        error: 'Error de configuración del servidor. Contacta al administrador.' 
      }, { status: 500 });
    }

    // 7. Subir archivo a Vercel Blob
    console.log('[API INFORMES] 📤 Subiendo archivo a Vercel Blob...');
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${alumno.id}_${archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    let blob;
    try {
      blob = await put(`informes/${fileName}`, archivo, {
        access: 'public',
      });
      console.log('[API INFORMES] ✅ Archivo subido a Blob. URL:', blob.url);
    } catch (blobError) {
      console.error('[API INFORMES] ❌ Error al subir a Vercel Blob:', blobError);
      return NextResponse.json({ 
        error: 'Error al subir el archivo. Intenta nuevamente.' 
      }, { status: 500 });
    }

    // 8. Crear informe en la base de datos
    console.log('[API INFORMES] 💾 Insertando en BD...');

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

    console.log('[API INFORMES] ✅ Informe registrado exitosamente. ID:', nuevoInforme.id);

    // ✅ Respuesta simple como objeto directo (igual que novedades)
    return new Response(JSON.stringify(nuevoInforme), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API INFORMES] ❌ ERROR CRÍTICO al crear informe');
    console.error('[API INFORMES] Tipo:', error.name);
    console.error('[API INFORMES] Mensaje:', error.message);
    console.error('[API INFORMES] Stack:', error.stack);
    
    return NextResponse.json({ 
      error: 'Error al procesar el informe: ' + error.message 
    }, { status: 500 });
  }
}