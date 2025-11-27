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
    
    // ✅ Respuesta simple como array directo
    return new Response(JSON.stringify(informes));

  } catch (error) {
    console.error('[API INFORMES] ❌ Error:', error);
    return NextResponse.json({ error: 'Error al obtener informes' }, { status: 500 });
  }
}

// ============================================
// POST - Crear informe (SIN AUTH)
// ============================================
export async function POST(request, { params }) {
  console.log('[API INFORMES] 📝 POST - Iniciando');

  try {
    const { cursoId } = await params;
    const formData = await request.formData();
    const archivo = formData.get('archivo');
    const alumnoEmail = formData.get('alumnoEmail');

    console.log('[API INFORMES] 📦 Datos:', { 
      cursoId,
      alumnoEmail,
      archivo: archivo?.name
    });

    // Validaciones
    if (!alumnoEmail?.trim()) {
      return NextResponse.json({ error: 'Email obligatorio' }, { status: 400 });
    }

    if (!archivo) {
      return NextResponse.json({ error: 'Archivo no proporcionado' }, { status: 400 });
    }

    if (archivo.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo PDF' }, { status: 400 });
    }

    if (archivo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Máximo 10MB' }, { status: 400 });
    }

    // Buscar o crear alumno
    let alumno = await prisma.user.findUnique({
      where: { email: alumnoEmail.trim() },
    });

    if (!alumno) {
      console.log('[API INFORMES] Creando alumno...');
      alumno = await prisma.user.create({
        data: {
          email: alumnoEmail.trim(),
          name: alumnoEmail.split('@')[0],
          role: 'STUDENT',
          password: '',
        },
      });
    }

    console.log('[API INFORMES] ✅ Alumno:', alumno.id);

    // Verificar duplicados
    const existe = await prisma.informe.findFirst({
      where: { cursoId, alumnoId: alumno.id },
    });

    if (existe) {
      return NextResponse.json({ 
        error: 'Ya existe un informe para este alumno' 
      }, { status: 400 });
    }

    // Subir a Blob
    console.log('[API INFORMES] Subiendo a Blob...');
    const timestamp = Date.now();
    const fileName = `${timestamp}_${alumno.id}_${archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const blob = await put(`informes/${fileName}`, archivo, {
      access: 'public',
    });

    console.log('[API INFORMES] ✅ Blob URL:', blob.url);

    // Crear informe
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

    console.log('[API INFORMES] ✅ Creado:', nuevoInforme.id);

    // ✅ Respuesta simple como objeto directo
    return new Response(JSON.stringify(nuevoInforme), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API INFORMES] ❌ ERROR:', error);
    console.error('[API INFORMES] Stack:', error.stack);
    
    return NextResponse.json({ 
      error: 'Error al crear informe: ' + error.message 
    }, { status: 500 });
  }
}