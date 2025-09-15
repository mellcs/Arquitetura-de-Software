// prisma/seeds.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Limpando tabelas...");
  await prisma.pagamento.deleteMany();
  await prisma.pedidoItem.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.cliente.deleteMany();

  console.log("Criando produtos...");
  const produtos = await prisma.produto.createMany({
    data: [
      { nome: "Caneca", preco: 25.0, estoque: 10 },
      { nome: "Camiseta", preco: 60.0, estoque: 5 },
      { nome: "Mouse", preco: 120.0, estoque: 3 }
    ]
  });

  console.log("👤 Criando clientes...");
  const clientes = await prisma.cliente.createMany({
    data: [
      { nome: "João", email: "joao@example.com" },
      { nome: "Maria", email: "maria@example.com" }
    ]
  });

  // Recupera os clientes para usar nos pedidos
  const clienteJoao = await prisma.cliente.findUnique({ where: { email: "joao@example.com" } });
  const clienteMaria = await prisma.cliente.findUnique({ where: { email: "maria@example.com" } });

  console.log("🛒 Criando pedidos...");
  const pedidoJoao = await prisma.pedido.create({
    data: {
      clienteId: clienteJoao.id,
      itens: {
        create: [
          { produtoId: 1, quantidade: 2, precoUnit: 25.0 }, // 2 Canecas
          { produtoId: 2, quantidade: 1, precoUnit: 60.0 }  // 1 Camiseta
        ]
      },
      valorTotal: 25.0 * 2 + 60.0
    },
    include: { itens: true }
  });

  const pedidoMaria = await prisma.pedido.create({
    data: {
      clienteId: clienteMaria.id,
      itens: {
        create: [
          { produtoId: 3, quantidade: 1, precoUnit: 120.0 } // 1 Mouse
        ]
      },
      valorTotal: 120.0
    },
    include: { itens: true }
  });

  console.log("Simulando pagamentos...");
  async function simularPagamento(pedidoId, metodo, valor) {
    const sucesso = Math.random() > 0.3; // 70% chance de sucesso
    await prisma.pagamento.create({
      data: {
        pedidoId,
        metodo,
        valor,
        sucesso
      }
    });

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        status: sucesso ? "PAGO" : "CANCELADO"
      }
    });
  }

  await simularPagamento(pedidoJoao.id, "Cartão de Crédito", pedidoJoao.valorTotal);
  await simularPagamento(pedidoMaria.id, "Pix", pedidoMaria.valorTotal);

  console.log("Seeds concluídas!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
