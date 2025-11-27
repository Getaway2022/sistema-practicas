// scripts/seed.js

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

import prisma from '@/lib/prisma';

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10); // Contraseña por defecto

  // Insertar usuarios (si no existen aún)
  await prisma.user.createMany({
    data: [
      {
        name: 'Estudiante Uno',
        email: 'alumno@fisi.edu.pe',
        password: passwordHash,
        role: 'STUDENT',
      },
      {
        name: 'Profesor Uno',
        email: 'profesor@fisi.edu.pe',
        password: passwordHash,
        role: 'PROFESSOR',
      },
      {
        name: 'Administrativo Uno',
        email: 'admin@fisi.edu.pe',
        password: passwordHash,
        role: 'ADMINISTRATIVE',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Usuarios insertados');

  // Obtener al profesor
  const profesor = await prisma.user.findFirst({
    where: { role: 'PROFESSOR' },
  });

  if (!profesor) {
    console.error('❌ No se encontró ningún profesor. No se insertaron cursos.');
    return;
  }

  // Insertar cursos asignados al profesor
  await prisma.curso.createMany({
    data: [
      {
        nombre: 'Prácticas Pre Profesionales G1',
        profesorId: profesor.id,
        profesorImagen: 'https://i.pravatar.cc/150?img=1',
      },
      {
        nombre: 'Taller de Empleabilidad',
        profesorId: profesor.id,
        profesorImagen: 'https://i.pravatar.cc/150?img=2',
      },
      {
        nombre: 'Desarrollo de Software I',
        profesorId: profesor.id,
        profesorImagen: 'https://i.pravatar.cc/150?img=3',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Cursos insertados');

  // Insertar oportunidades de prueba
  await prisma.oportunidad.createMany({
  data: [
    {
      titulo: 'Prácticas en Desarrollo Web Fullstack',
      descripcion:
        'Únete a nuestro equipo de desarrollo web donde colaborarás en la creación de aplicaciones modernas usando React, Node.js y bases de datos como PostgreSQL. Ideal para estudiantes con interés en frontend y backend.',
      imagen: 'https://source.unsplash.com/featured/?programming,web',
    },
    {
      titulo: 'Asistente de Soporte Técnico y Redes',
      descripcion:
        'Apoya al área de soporte resolviendo incidencias técnicas, configurando redes y brindando atención a usuarios internos. Se valorará conocimientos básicos en hardware y sistemas operativos.',
      imagen: 'https://source.unsplash.com/featured/?technical,support,network',
    },
    {
      titulo: 'Internship en Análisis y Visualización de Datos',
      descripcion:
        'Participa en proyectos reales donde aprenderás a limpiar, transformar y visualizar datos con herramientas como Python, SQL y Power BI. Requiere conocimientos básicos en bases de datos.',
      imagen: 'https://source.unsplash.com/featured/?data,analytics',
    },
    {
      titulo: 'Prácticas en Ciberseguridad y Auditoría Informática',
      descripcion:
        'Colabora en tareas de revisión de seguridad, análisis de riesgos y control de accesos. Se valoran conocimientos en redes, firewalls y normas ISO 27001.',
      imagen: 'https://source.unsplash.com/featured/?cybersecurity',
    },
    {
      titulo: 'Desarrollador Mobile Junior (React Native)',
      descripcion:
        'Trabaja en el desarrollo de aplicaciones móviles híbridas con React Native. Ideal para estudiantes que deseen adquirir experiencia en el mundo móvil.',
      imagen: 'https://source.unsplash.com/featured/?mobile,app,development',
    },
  ],
  skipDuplicates: true,
});


  console.log('✅ Oportunidades insertadas');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
