import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '../../../../lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

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

      return NextResponse.json(informes);
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

      return NextResponse.json(informes);
    }

    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  } catch (error) {
    console.error('Error al obtener informes:', error);
    return NextResponse.json({ error: 'Error al obtener informes' }, { status: 500 });
  }
}

// POST: Crear un nuevo informe (solo estudiantes)
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { cursoId } = await params;
    const formData = await request.formData();
    const archivo = formData.get('archivo');

    if (!archivo) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validar que sea PDF
    if (archivo.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 });
    }

    // Validar tamaño (10MB)
    if (archivo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no debe superar los 10MB' }, { status: 400 });
    }

    // Verificar que el estudiante esté inscrito en el curso
    // TEMPORAL: Comentado hasta configurar el modelo Inscripcion
    /*
    const inscripcion = await prisma.inscripcion.findUnique({
      where: {
        alumnoId_cursoId: {
          alumnoId: session.user.id,
          cursoId,
        },
      },
    });

    if (!inscripcion) {
      return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
    }
    */

    // Verificar si ya existe un informe para este alumno en este curso
    const informeExistente = await prisma.informe.findFirst({
      where: {
        cursoId,
        alumnoId: session.user.id,
      },
    });

    if (informeExistente) {
      return NextResponse.json({ error: 'Ya tienes un informe subido para este curso' }, { status: 400 });
    }

    // Guardar el archivo en el servidor
    const bytes = await archivo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear nombre único y seguro para el archivo
    const timestamp = Date.now();
    const fileName = `${timestamp}_${session.user.id}_${archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Definir la ruta del directorio
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'informes');
    
    // Crear el directorio si no existe
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Ruta completa del archivo
    const filePath = path.join(uploadDir, fileName);
    
    // Guardar el archivo
    await writeFile(filePath, buffer);

    // URL pública del archivo
    const archivoUrl = `/uploads/informes/${fileName}`;

    // Crear el informe en la base de datos
    const nuevoInforme = await prisma.informe.create({
      data: {
        cursoId,
        alumnoId: session.user.id,
        archivo: archivoUrl,
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

    return NextResponse.json(nuevoInforme, { status: 201 });
  } catch (error) {
    console.error('Error al crear informe:', error);
    return NextResponse.json({ 
      error: 'Error al crear informe', 
      details: error.message 
    }, { status: 500 });
  }
}