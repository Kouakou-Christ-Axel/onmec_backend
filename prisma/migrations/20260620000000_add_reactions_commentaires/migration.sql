-- CreateTable
CREATE TABLE "reactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "signalementId" UUID,
    "actualiteId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaires" (
    "id" UUID NOT NULL,
    "contenu" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "signalementId" UUID,
    "actualiteId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commentaires_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reactions_signalementId_idx" ON "reactions"("signalementId");

-- CreateIndex
CREATE INDEX "reactions_actualiteId_idx" ON "reactions"("actualiteId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_signalementId_key" ON "reactions"("userId", "signalementId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_actualiteId_key" ON "reactions"("userId", "actualiteId");

-- CreateIndex
CREATE INDEX "commentaires_signalementId_idx" ON "commentaires"("signalementId");

-- CreateIndex
CREATE INDEX "commentaires_actualiteId_idx" ON "commentaires"("actualiteId");

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_signalementId_fkey" FOREIGN KEY ("signalementId") REFERENCES "signalements_citoyens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_actualiteId_fkey" FOREIGN KEY ("actualiteId") REFERENCES "Actualite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_signalementId_fkey" FOREIGN KEY ("signalementId") REFERENCES "signalements_citoyens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_actualiteId_fkey" FOREIGN KEY ("actualiteId") REFERENCES "Actualite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
