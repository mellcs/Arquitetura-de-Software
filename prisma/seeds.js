const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.status.createMany({
    data: [
      { name: "AGUARDANDO PAGAMENTO" },
      { name: "FALHA NO PAGAMENTO" },
      { name: "PAGO" },
      { name: "CANCELADO" }
    ],
    skipDuplicates: true,
  });

  await prisma.typePayments.createMany({
    data: [
      { name: "PIX" },
      { name: "BOLETO" },
      { name: "CREDITO" }
    ],
    skipDuplicates: true,
  });
}

main()
  .then(() => console.log("Seeds inseridos com sucesso"))
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
