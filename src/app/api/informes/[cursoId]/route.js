import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '../../../../lib/prisma';
import { put } from '@vercel/blob';

// GET: Obtener todos los informes de un curso
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { cursoId } = await params;

    // Si es profesor, obtener todos los informes del curso
    if (session.user.role === 'PROFESSOR') {
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

      return NextResponse.json({
        success: true,
        data: informes
      });
    }

    // Si es estudiante, solo obtener sus propios informes
    if (session.user.role === 'STUDENT') {
      const informes = await prisma.informe.findMany({
        where: {
          cursoId,
          alumnoId: session.user.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: informes
      });
    }

    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  } catch (error) {
    console.error('Error al obtener informes:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener informes: ' + error.message 
    }, { status: 500 });
  }
}

// POST: Crear un nuevo informe (solo estudiantes)
export async function POST(request, { params }) {
  console.log('[API] 📝 Iniciando registro de informe');
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ 
        success: false,
        error: 'No autenticado' 
      }, { status: 401 });
    }

    const { cursoId } = await params;
    const formData = await request.formData();
    const archivo = formData.get('archivo');
    const alumnoEmail = formData.get('alumnoEmail');

    console.log('[API] 📦 Datos recibidos:', { 
      cursoId,
      alumnoEmail,
      sessionEmail: session.user.email,
      archivoNombre: archivo?.name,
      archivoTamaño: archivo?.size
    });

    // Validaciones
    if (!archivo) {
      return NextResponse.json({ 
        success: false,
        error: 'No se proporcionó archivo' 
      }, { status: 400 });
    }

    if (archivo.type !== 'application/pdf') {
      return NextResponse.json({ 
        success: false,
        error: 'Solo se permiten archivos PDF' 
      }, { status: 400 });
    }

    if (archivo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        success: false,
        error: 'El archivo no debe superar los 10MB' 
      }, { status: 400 });
    }

    // Buscar alumno
    let alumno = await prisma.user.findUnique({
      where: { email: alumnoEmail },
    });

    if (!alumno) {
      console.log('[API] ❌ Usuario no encontrado:', alumnoEmail);
      return NextResponse.json({ 
        success: false,
        error: 'Usuario no encontrado' 
      }, { status: 404 });
    }

    console.log('[API] ✅ Alumno identificado. ID:', alumno.id);

    // Verificar si ya existe un informe
    const informeExistente = await prisma.informe.findFirst({
      where: {
        cursoId,
        alumnoId: alumno.id,
      },
    });

    if (informeExistente) {
      return NextResponse.json({ 
        success: false,
        error: 'Ya tienes un informe subido para este curso. Elimina el anterior antes de subir uno nuevo.' 
      }, { status: 400 });
    }

    // Subir a Vercel Blob
    console.log('[API] 📤 Subiendo archivo a Vercel Blob...');
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${alumno.id}_${archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const blob = await put(`informes/${fileName}`, archivo, {
      access: 'public',
    });

    console.log('[API] ✅ Archivo subido. URL:', blob.url);

    // Crear el informe en la base de datos
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

    return NextResponse.json({
      success: true,
      message: 'Informe subido correctamente',
      data: nuevoInforme
    }, { status: 201 });
    
  } catch (error) {
    console.error('[API] ❌ Error al crear informe:', error);
    console.error('[API] Stack:', error.stack);
    
    return NextResponse.json({ 
      success: false,
      error: 'Error al crear informe: ' + error.message,
      details: error.message 
    }, { status: 500 });
  }
}