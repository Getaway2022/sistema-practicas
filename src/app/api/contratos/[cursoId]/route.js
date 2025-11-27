// app/api/contratos/[cursoId]/route.js
import { PrismaClient } from '@prisma/client';
import { put, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

// ============================================
// GET - Obtener contratos (SIN AUTH)
// ============================================
export async function GET(req, context) {
  console.log('[API CONTRATOS] 📋 GET - Iniciando');
  
  try {
    const params = await context.params;
    const cursoId = params?.cursoId;

    if (!cursoId) {
      return NextResponse.json({ error: 'cursoId requerido' }, { status: 400 });
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
// POST - Crear contrato (SIN AUTH + VERCEL BLOB)
// ============================================
export async function POST(req, context) {
  console.log('[API CONTRATOS] 📝 POST - Iniciando');

  try {
    const params = await context.params;
    const cursoId = params?.cursoId;

    if (!cursoId) {
      console.error('[API CONTRATOS] ❌ cursoId no proporcionado');
      return NextResponse.json({ error: 'cursoId requerido' }, { status: 400 });
    }

    console.log('[API CONTRATOS] ✅ cursoId:', cursoId);

    // Obtener FormData
    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error('[API CONTRATOS] ❌ Error al parsear FormData:', formError);
      return NextResponse.json({ 
        error: 'Error al procesar el formulario' 
      }, { status: 400 });
    }

    const archivo = formData.get('archivo');
    const alumnoEmail = formData.get('alumnoEmail');

    console.log('[API CONTRATOS] 📦 Datos recibidos:', { 
      cursoId,
      alumnoEmail,
      tieneArchivo: !!archivo,
      archivoNombre: archivo?.name,
      archivoTamaño: archivo?.size,
      archivoTipo: archivo?.type
    });

    // Validaciones
    if (!alumnoEmail || !alumnoEmail.trim()) {
      console.error('[API CONTRATOS] ❌ Email no proporcionado');
      return NextResponse.json({ 
        error: 'El email del alumno es obligatorio' 
      }, { status: 400 });
    }

    if (!archivo || typeof archivo === 'string') {
      console.error('[API CONTRATOS] ❌ Archivo no válido');
      return NextResponse.json({ 
        error: 'Debes seleccionar un archivo PDF válido' 
      }, { status: 400 });
    }

    if (archivo.type !== 'application/pdf') {
      console.error('[API CONTRATOS] ❌ Tipo inválido:', archivo.type);
      return NextResponse.json({ 
        error: 'Solo se permiten archivos PDF' 
      }, { status: 400 });
    }

    if (archivo.size > 10 * 1024 * 1024) {
      console.error('[API CONTRATOS] ❌ Archivo muy grande:', archivo.size);
      return NextResponse.json({ 
        error: 'El archivo no debe superar los 10MB' 
      }, { status: 400 });
    }

    console.log('[API CONTRATOS] ✅ Validaciones pasadas');

    // Buscar o crear alumno
    let alumno = await prisma.user.findUnique({
      where: { email: alumnoEmail.trim() },
    });

    if (!alumno) {
      console.log('[API CONTRATOS] 👤 Creando nuevo alumno:', alumnoEmail);
      
      try {
        alumno = await prisma.user.create({
          data: {
            email: alumnoEmail.trim(),
            name: alumnoEmail.split('@')[0],
            role: 'STUDENT',
            password: '',
          },
        });
        console.log('[API CONTRATOS] ✅ Alumno creado:', alumno.id);
      } catch (createError) {
        console.error('[API CONTRATOS] ❌ Error al crear alumno:', createError);
        return NextResponse.json({ 
          error: 'Error al crear usuario: ' + createError.message 
        }, { status: 500 });
      }
    } else {
      console.log('[API CONTRATOS] ✅ Alumno encontrado:', alumno.id);
    }

    // Verificar duplicados
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

    // Verificar token de Vercel Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[API CONTRATOS] ❌ BLOB_READ_WRITE_TOKEN no configurado');
      return NextResponse.json({ 
        error: 'Error de configuración del servidor (BLOB_READ_WRITE_TOKEN). Contacta al administrador.' 
      }, { status: 500 });
    }

    // ============================================
    // 🔥 SUBIR A VERCEL BLOB (NO AL FILESYSTEM)
    // ============================================
    console.log('[API CONTRATOS] 📤 Subiendo archivo a Vercel Blob...');
    
    const timestamp = Date.now();
    const safeFileName = archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobFileName = `contratos/${timestamp}_${alumno.id}_${safeFileName}`;
    
    console.log('[API CONTRATOS] 📝 Nombre del blob:', blobFileName);

    let blob;
    try {
      // ✅ ESTO ES LO CORRECTO: Subir directamente a Vercel Blob
      blob = await put(blobFileName, archivo, {
        access: 'public',
      });
      
      console.log('[API CONTRATOS] ✅ Archivo subido a Blob exitosamente');
      console.log('[API CONTRATOS] 🔗 URL:', blob.url);
      
    } catch (blobError) {
      console.error('[API CONTRATOS] ❌ Error al subir a Vercel Blob:', blobError);
      console.error('[API CONTRATOS] ❌ Stack:', blobError.stack);
      return NextResponse.json({ 
        error: 'Error al subir el archivo a Vercel Blob. Verifica la configuración.' 
      }, { status: 500 });
    }

    // Crear contrato en BD
    console.log('[API CONTRATOS] 💾 Insertando en BD...');

    let contrato;
    try {
      contrato = await prisma.contrato.create({
        data: {
          archivo: blob.url,  // ✅ Guardar la URL de Vercel Blob
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
      
    } catch (dbError) {
      console.error('[API CONTRATOS] ❌ Error al crear en BD:', dbError);
      
      // Si falla la BD, intentar eliminar el archivo de Blob
      try {
        await del(blob.url);
        console.log('[API CONTRATOS] 🧹 Blob eliminado tras error en BD');
      } catch (cleanupError) {
        console.error('[API CONTRATOS] ⚠️ No se pudo limpiar el blob:', cleanupError);
      }
      
      return NextResponse.json({ 
        error: 'Error al guardar en base de datos: ' + dbError.message 
      }, { status: 500 });
    }

    return new Response(JSON.stringify(contrato), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API CONTRATOS] ❌ ERROR CRÍTICO');
    console.error('[API CONTRATOS] Nombre:', error.name);
    console.error('[API CONTRATOS] Mensaje:', error.message);
    console.error('[API CONTRATOS] Stack:', error.stack);
    
    return NextResponse.json({ 
      error: 'Error interno del servidor: ' + error.message 
    }, { status: 500 });
  }
}

// ============================================
// DELETE - Eliminar contrato (SIN AUTH)
// ============================================
export async function DELETE(req, context) {
  console.log('[API CONTRATOS] 🗑️ DELETE - Iniciando');

  try {
    const params = await context.params;
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get('contratoId');

    console.log('[API CONTRATOS] ContratoId:', contratoId);

    if (!contratoId) {
      return NextResponse.json({ 
        error: 'contratoId es requerido' 
      }, { status: 400 });
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: { alumno: true }
    });

    if (!contrato) {
      return NextResponse.json({ 
        error: 'Contrato no encontrado' 
      }, { status: 404 });
    }

    // Eliminar de Vercel Blob
    try {
      await del(contrato.archivo);
      console.log('[API CONTRATOS] ✅ Archivo eliminado de Blob');
    } catch (blobError) {
      console.error('[API CONTRATOS] ⚠️ Error al eliminar de Blob:', blobError);
    }

    // Eliminar de BD
    await prisma.contrato.delete({
      where: { id: contratoId }
    });

    console.log('[API CONTRATOS] ✅ Contrato eliminado de BD');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Contrato eliminado correctamente' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API CONTRATOS] ❌ Error DELETE:', error);
    return NextResponse.json({ 
      error: 'Error al eliminar: ' + error.message 
    }, { status: 500 });
  }
}