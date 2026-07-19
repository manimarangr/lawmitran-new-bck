-- AlterTable
ALTER TABLE "LawyerOffice" ADD COLUMN     "localityId" TEXT;

-- CreateTable
CREATE TABLE "Locality" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Locality_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Locality_cityId_idx" ON "Locality"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Locality_cityId_slug_key" ON "Locality"("cityId", "slug");

-- AddForeignKey
ALTER TABLE "LawyerOffice" ADD CONSTRAINT "LawyerOffice_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locality" ADD CONSTRAINT "Locality_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
