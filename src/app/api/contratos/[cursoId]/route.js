// app/api/contratos/[cursoId]/route.js

import prisma from '@/lib/prisma';
import { put, del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// ============================================
// GET - Obtener contratos
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
    
    return NextResponse.json({
      success: true,
      data: contratos
    });

  } catch (error) {
    console.error('[API CONTRATOS] ❌ Error GET:', error);
    return NextResponse.json({ 
      success: false,
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
    // ✅ VALIDACIÓN CRÍTICA: Verificar token de Blob PRIMERO
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[API CONTRATOS] ❌ BLOB_READ_WRITE_TOKEN no configurado');
      return NextResponse.json({ 
        success: false,
        error: 'Error de configuración del servidor. BLOB_READ_WRITE_TOKEN no está configurado.' 
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    console.log('[API CONTRATOS] 🔐 Sesión:', {
      hasSession: !!session,
      email: session?.user?.email,
      role: session?.user?.role
    });

    if (!session?.user?.email) {
      console.log('[API CONTRATOS] ❌ Sin sesión válida');
      return NextResponse.json({ 
        success: false,
        error: 'Debes iniciar sesión para subir contratos' 
      }, { status: 401 });
    }

    const params = await context.params;
    const cursoId = params?.cursoId;

    if (!cursoId) {
      console.error('[API CONTRATOS] ❌ cursoId no proporcionado');
      return NextResponse.json({ 
        success: false,
        error: 'cursoId requerido' 
      }, { status: 400 });
    }

    console.log('[API CONTRATOS] ✅ cursoId:', cursoId);

    // Obtener FormData
    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error('[API CONTRATOS] ❌ Error al parsear FormData:', formError);
      return NextResponse.json({ 
        success: false,
        error: 'Error al procesar el formulario' 
      }, { status: 400 });
    }

    const archivo = formData.get('archivo');
    const alumnoEmail = session.user.email;

    console.log('[API CONTRATOS] 📦 Datos recibidos:', { 
      cursoId,
      alumnoEmail,
      tieneArchivo: !!archivo,
      archivoNombre: archivo?.name,
      archivoTamaño: archivo?.size,
      archivoTipo: archivo?.type
    });

    // Validaciones
    if (!archivo || typeof archivo === 'string') {
      console.error('[API CONTRATOS] ❌ Archivo no válido');
      return NextResponse.json({ 
        success: false,
        error: 'Debes seleccionar un archivo PDF válido' 
      }, { status: 400 });
    }

    if (archivo.type !== 'application/pdf') {
      console.error('[API CONTRATOS] ❌ Tipo inválido:', archivo.type);
      return NextResponse.json({ 
        success: false,
        error: 'Solo se permiten archivos PDF' 
      }, { status: 400 });
    }

    if (archivo.size > 10 * 1024 * 1024) {
      console.error('[API CONTRATOS] ❌ Archivo muy grande:', archivo.size);
      return NextResponse.json({ 
        success: false,
        error: 'El archivo no debe superar los 10MB' 
      }, { status: 400 });
    }

    console.log('[API CONTRATOS] ✅ Validaciones pasadas');

    const alumno = await prisma.user.findUnique({
      where: { email: alumnoEmail },
    });

    if (!alumno) {
      console.log('[API CONTRATOS] ❌ Usuario no encontrado:', alumnoEmail);
      return NextResponse.json({ 
        success: false,
        error: 'Usuario no encontrado. Asegúrate de haber iniciado sesión correctamente.' 
      }, { status: 404 });
    }

    console.log('[API CONTRATOS] ✅ Alumno encontrado:', alumno.id);

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
        success: false,
        error: 'Ya existe un contrato para este alumno en este curso. Elimina el anterior antes de subir uno nuevo.' 
      }, { status: 400 });
    }

    // ============================================
    // SUBIR A VERCEL BLOB - CON MANEJO DE ERRORES MEJORADO
    // ============================================
    console.log('[API CONTRATOS] 📤 Subiendo archivo a Vercel Blob...');
    
    const timestamp = Date.now();
    const safeFileName = archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobFileName = `contratos/${timestamp}_${alumno.id}_${safeFileName}`;
    
    console.log('[API CONTRATOS] 📝 Nombre del blob:', blobFileName);
    console.log('[API CONTRATOS] 🔑 Token configurado:', !!process.env.BLOB_READ_WRITE_TOKEN);

    let blob;
    try {
      // ✅ Especificar explícitamente el token
      blob = await put(blobFileName, archivo, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN, // ← Explícitamente pasado
      });
      
      console.log('[API CONTRATOS] ✅ Archivo subido a Blob exitosamente');
      console.log('[API CONTRATOS] 🔗 URL:', blob.url);
      console.log('[API CONTRATOS] 🔗 Pathname:', blob.pathname);
      
    } catch (blobError) {
      console.error('[API CONTRATOS] ❌ Error al subir a Vercel Blob:', blobError);
      console.error('[API CONTRATOS] ❌ Mensaje:', blobError.message);
      console.error('[API CONTRATOS] ❌ Stack:', blobError.stack);
      console.error('[API CONTRATOS] ❌ Nombre del error:', blobError.name);
      
      return NextResponse.json({ 
        success: false,
        error: 'Error al subir el archivo a Vercel Blob: ' + blobError.message 
      }, { status: 500 });
    }

    // Crear contrato en BD
    console.log('[API CONTRATOS] 💾 Insertando en BD...');

    let contrato;
    try {
      contrato = await prisma.contrato.create({
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
      
    } catch (dbError) {
      console.error('[API CONTRATOS] ❌ Error al crear en BD:', dbError);
      
      // Si falla la BD, intentar eliminar el archivo de Blob
      try {
        await del(blob.url, {
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
        console.log('[API CONTRATOS] 🧹 Blob eliminado tras error en BD');
      } catch (cleanupError) {
        console.error('[API CONTRATOS] ⚠️ No se pudo limpiar el blob:', cleanupError);
      }
      
      return NextResponse.json({ 
        success: false,
        error: 'Error al guardar en base de datos: ' + dbError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contrato registrado correctamente',
      data: contrato
    }, { status: 201 });

  } catch (error) {
    console.error('[API CONTRATOS] ❌ ERROR CRÍTICO');
    console.error('[API CONTRATOS] Nombre:', error.name);
    console.error('[API CONTRATOS] Mensaje:', error.message);
    console.error('[API CONTRATOS] Stack:', error.stack);
    
    return NextResponse.json({ 
      success: false,
      error: 'Error interno del servidor: ' + error.message 
    }, { status: 500 });
  }
}

// ============================================
// DELETE - Eliminar contrato
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
        success: false,
        error: 'contratoId es requerido' 
      }, { status: 400 });
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: { alumno: true }
    });

    if (!contrato) {
      return NextResponse.json({ 
        success: false,
        error: 'Contrato no encontrado' 
      }, { status: 404 });
    }

    // Eliminar de Vercel Blob
    try {
      await del(contrato.archivo, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      console.log('[API CONTRATOS] ✅ Archivo eliminado de Blob');
    } catch (blobError) {
      console.error('[API CONTRATOS] ⚠️ Error al eliminar de Blob:', blobError);
    }

    // Eliminar de BD
    await prisma.contrato.delete({
      where: { id: contratoId }
    });

    console.log('[API CONTRATOS] ✅ Contrato eliminado de BD');

    return NextResponse.json({ 
      success: true,
      message: 'Contrato eliminado correctamente' 
    });

  } catch (error) {
    console.error('[API CONTRATOS] ❌ Error DELETE:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error al eliminar: ' + error.message 
    }, { status: 500 });
  }
}