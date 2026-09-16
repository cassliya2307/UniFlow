-- AddColumn
ALTER TABLE "User" ADD "matriculationNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_matriculationNumber_key" ON "User"("matriculationNumber") WHERE "matriculationNumber" IS NOT NULL;