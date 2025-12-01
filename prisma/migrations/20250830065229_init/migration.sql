-- CreateTable
CREATE TABLE "public"."Solicitacao" (
    "id" SERIAL NOT NULL,
    "solicitacao" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "regional" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "detalhes" TEXT NOT NULL,
    "prazo" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "emergencial" BOOLEAN NOT NULL,
    "equipe" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Solicitacao_pkey" PRIMARY KEY ("id")
);
