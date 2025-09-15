-- CreateTable
CREATE TABLE "public"."Clients" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Status" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Produtos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "estoque" INTEGER NOT NULL,

    CONSTRAINT "Produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pedidos" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "clientId" INTEGER,
    "statusId" INTEGER,

    CONSTRAINT "Pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pedido_Produto" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnit" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Pedido_Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TypePayments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TypePayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderPayments" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "paymentTypeId" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderPayments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clients_email_key" ON "public"."Clients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Status_name_key" ON "public"."Status"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TypePayments_name_key" ON "public"."TypePayments"("name");

-- AddForeignKey
ALTER TABLE "public"."Pedidos" ADD CONSTRAINT "Pedidos_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedidos" ADD CONSTRAINT "Pedidos_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "public"."Status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido_Produto" ADD CONSTRAINT "Pedido_Produto_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido_Produto" ADD CONSTRAINT "Pedido_Produto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "public"."Produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderPayments" ADD CONSTRAINT "OrderPayments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderPayments" ADD CONSTRAINT "OrderPayments_paymentTypeId_fkey" FOREIGN KEY ("paymentTypeId") REFERENCES "public"."TypePayments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
