// =====================================================
// API ROUTE: /api/oportunidades/route.js
// =====================================================

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================

const CONFIG = {
  defaultImage: '/images/default-oportunidad.jpg',
  maxTitleLength: 200,
  maxDescriptionLength: 5000
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_CONSTRAINT_ERROR: 'DB_CONSTRAINT_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

const PRISMA_ERROR_CODES = {
  CONNECTION_ERROR: 'P1001',
  CONSTRAINT_PREFIX: 'P2'
};

// ============================================
// VALIDADORES
// ============================================

function isValidImagePath(path) {
  if (!path || typeof path !== 'string') return true;
  
  const trimmedPath = path.trim();
  if (trimmedPath.startsWith('/')) return true;
  
  try {
    const url = new URL(trimmedPath);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateOportunidadData(data) {
  const errors = [];

  if (!data.titulo?.trim()) {
    errors.push('El título es obligatorio');
  } else if (data.titulo.trim().length > CONFIG.maxTitleLength) {
    errors.push(`El título debe tener máximo ${CONFIG.maxTitleLength} caracteres`);
  }

  if (!data.descripcion?.trim()) {
    errors.push('La descripción es obligatoria');
  } else if (data.descripcion.trim().length > CONFIG.maxDescriptionLength) {
    errors.push(`La descripción debe tener máximo ${CONFIG.maxDescriptionLength} caracteres`);
  }

  if (data.imagen && !isValidImagePath(data.imagen)) {
    errors.push('La URL de la imagen no es válida');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

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

function errorResponse(message, code, status = 400, details = null) {
  const response = {
    success: false,
    error: message,
    message,
    code
  };

  if (details) response.details = details;

  return NextResponse.json(response, { status });
}

// ============================================
// MANEJADORES DE ERRORES
// ============================================

function handlePrismaError(error) {
  console.error('[PRISMA ERROR]', error);

  if (error.code === PRISMA_ERROR_CODES.CONNECTION_ERROR) {
    return errorResponse(
      'No se pudo conectar a la base de datos',
      ERROR_CODES.DB_CONNECTION_ERROR,
      503
    );
  }

  if (error.code?.startsWith(PRISMA_ERROR_CODES.CONSTRAINT_PREFIX)) {
    return errorResponse(
      'No se pudo guardar la oportunidad. Verifica los datos',
      ERROR_CODES.DB_CONSTRAINT_ERROR,
      400
    );
  }

  return errorResponse(
    'Error al procesar la solicitud en la base de datos',
    ERROR_CODES.INTERNAL_ERROR,
    500
  );
}

function handleJsonError(error) {
  console.error('[JSON PARSE ERROR]', error);
  return errorResponse(
    'El formato de los datos no es válido',
    ERROR_CODES.INVALID_JSON,
    400
  );
}

function handleGenericError(error) {
  console.error('[UNEXPECTED ERROR]', error);
  return errorResponse(
    'Ocurrió un error inesperado. Por favor intenta nuevamente',
    ERROR_CODES.INTERNAL_ERROR,
    500
  );
}

// ============================================
// ENDPOINT GET
// ============================================

export async function GET(request) {
  console.log('[API] 📋 Solicitando lista de oportunidades');

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    const page = parseInt(searchParams.get('page')) || 1;
    const skip = (page - 1) * limit;

    const [oportunidades, total] = await Promise.all([
      prisma.oportunidad.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.oportunidad.count()
    ]);

    console.log(`[API] ✅ Retornando ${oportunidades.length} oportunidades`);

    return successResponse(
      {
        oportunidades,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      },
      'Oportunidades obtenidas correctamente'
    );

  } catch (error) {
    console.error('[API] ❌ Error al obtener oportunidades:', error);
    return handleGenericError(error);
  }
}

// ============================================
// ENDPOINT POST
// ============================================

export async function POST(request) {
  console.log('[API] 📝 Iniciando registro de oportunidad');

  try {
    const body = await request.json();
    const { titulo, descripcion, imagen } = body;

    console.log('[API] 📦 Datos recibidos:', { 
      titulo: titulo?.substring(0, 50), 
      descripcion: descripcion?.substring(0, 50),
      imagen: imagen || 'No proporcionada'
    });

    const validation = validateOportunidadData({ titulo, descripcion, imagen });

    if (!validation.isValid) {
      console.log('[API] ❌ Validación fallida:', validation.errors);
      return errorResponse(
        validation.errors.join('. '),
        ERROR_CODES.VALIDATION_ERROR,
        400,
        validation.errors
      );
    }

    console.log('[API] ✅ Validación exitosa');

    const dataToInsert = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      imagen: imagen?.trim() || CONFIG.defaultImage
    };

    console.log('[API] 💾 Insertando en BD...');

    const oportunidad = await prisma.oportunidad.create({
      data: dataToInsert
    });

    console.log('[API] ✅ Registro exitoso. ID:', oportunidad.id);

    return successResponse(
      oportunidad,
      '✅ Oportunidad registrada correctamente',
      201
    );

  } catch (error) {
    if (error.name === 'PrismaClientKnownRequestError') {
      return handlePrismaError(error);
    }

    if (error instanceof SyntaxError) {
      return handleJsonError(error);
    }

    return handleGenericError(error);
  }
}

// ============================================
// ENDPOINT DELETE
// ============================================

export async function DELETE(request) {
  console.log('[API] 🗑️ Solicitando eliminar oportunidad');

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(
        'ID de oportunidad no proporcionado',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    console.log('[API] 🔍 Buscando oportunidad con ID:', id);

    const oportunidadExiste = await prisma.oportunidad.findUnique({
      where: { id }
    });

    if (!oportunidadExiste) {
      return errorResponse(
        'Oportunidad no encontrada',
        ERROR_CODES.VALIDATION_ERROR,
        404
      );
    }

    await prisma.oportunidad.delete({
      where: { id }
    });

    console.log('[API] ✅ Oportunidad eliminada exitosamente');

    return successResponse(
      { id },
      '✅ Oportunidad eliminada correctamente',
      200
    );

  } catch (error) {
    if (error.name === 'PrismaClientKnownRequestError') {
      return handlePrismaError(error);
    }
    return handleGenericError(error);
  }
}