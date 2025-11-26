/*
  Warnings:

  - The `estado` column on the `Contrato` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `estado` column on the `Informe` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EstadoContrato" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoInforme" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "Contrato" ADD COLUMN     "fechaLimite" TIMESTAMP(3),
DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoContrato" NOT NULL DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE "Informe" DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoInforme" NOT NULL DEFAULT 'PENDIENTE';

-- CreateTable
CREATE TABLE "Novedad" (
    "id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Novedad_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Novedad" ADD CONSTRAINT "Novedad_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
