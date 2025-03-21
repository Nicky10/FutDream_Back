/*
  Warnings:

  - Added the required column `courtNumber` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `serviceType` on the `Booking` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('FUTBOL_5', 'FUTBOL_11', 'PADEL', 'BOLOS');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "courtNumber" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "serviceType",
ADD COLUMN     "serviceType" "ServiceType" NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
