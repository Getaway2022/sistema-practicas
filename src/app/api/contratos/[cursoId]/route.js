import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(req, context) {
  const params = await context.params; // 👈 Await params
  const cursoId = params?.cursoId;

  const contratos = await prisma.contrato.findMany({
    where: { cursoId },
    include: { alumno: true },
  });

  return new Response(JSON.stringify(contratos));
}

export async function POST(req, context) {
  const params = await context.params; // 👈 Await params
  const cursoId = params?.cursoId;

  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user || user.role !== 'STUDENT') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const alumno = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!alumno) {
    return new Response(JSON.stringify({ error: 'Alumno no encontrado' }), { status: 404 });
  }

  const formData = await req.formData();
  const archivo = formData.get('archivo');

  if (!archivo || typeof archivo === 'string') {
    return new Response(JSON.stringify({ error: 'Archivo no válido' }), {
      status: 400,
    });
  }

  const bytes = await archivo.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${uuid()}-${archivo.name}`;
  const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

  await writeFile(filepath, buffer);

  const contrato = await prisma.contrato.create({
    data: {
      archivo: `/uploads/${filename}`,
      estado: 'PENDIENTE',
      alumnoId: alumno.id,
      cursoId,
    },
  });

  return new Response(JSON.stringify(contrato));
}