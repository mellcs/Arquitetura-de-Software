const express = require("express");
const { PrismaClient } = require("@prisma/client");
const app = express();
const PORT = 3000;

const prisma = new PrismaClient();
app.use(express.json());

//
// ROTAS DE CLIENTES
//

// cadastrar cliente
app.post("/clients", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ erro: "Nome e email são obrigatórios" });

  try {
    const novoCliente = await prisma.clients.create({ data: { name, email } });
    res.status(201).json(novoCliente);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao cadastrar cliente" });
  }
});

// listar pedidos de um cliente
app.get("/clients/:id/orders", async (req, res) => {
  const id = parseInt(req.params.id);
  const pedidos = await prisma.pedidos.findMany({
    where: { id_client: id },
    include: { itens: true, status: true, payments: { include: { typePayment: true } } },
  });
  res.json(pedidos);
});

//
// ROTAS DE PRODUTOS
//
app.get("/produtos", async (req, res) => {
  const produtos = await prisma.produtos.findMany();
  res.json(produtos);
});

app.get("/produtos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const produto = await prisma.produtos.findUnique({ where: { id } });
  if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });
  res.json(produto);
});

app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;
  if (!nome || preco == null || estoque == null) {
    return res.status(400).json({ erro: "Campos obrigatórios: nome, preco, estoque" });
  }
  const novoProduto = await prisma.produtos.create({
    data: { nome, preco, estoque },
  });
  res.status(201).json(novoProduto);
});

// não é mais possível atualizar o estoque por aqui
app.put("/produtos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, preco } = req.body;

  const produtoExistente = await prisma.produtos.findUnique({ where: { id } });
  if (!produtoExistente) return res.status(404).json({ erro: "Produto não encontrado" });

  const produtoAtualizado = await prisma.produtos.update({
    where: { id },
    data: {
      nome: nome ?? produtoExistente.nome,
      preco: preco ?? produtoExistente.preco,
    },
  });

  res.json(produtoAtualizado);
});

// endpoint, atualiza o estoque separado
app.put("/products/:id/stocks", async (req, res) => {
  const id = parseInt(req.params.id);
  const { estoque } = req.body;

  if (estoque == null) return res.status(400).json({ erro: "Estoque é obrigatório" });

  const produtoExistente = await prisma.produtos.findUnique({ where: { id } });
  if (!produtoExistente) return res.status(404).json({ erro: "Produto não encontrado" });

  const atualizado = await prisma.produtos.update({
    where: { id },
    data: { estoque },
  });

  res.json(atualizado);
});

app.delete("/produtos/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  const produtoExistente = await prisma.produtos.findUnique({ where: { id } });
  if (!produtoExistente) return res.status(404).json({ erro: "Produto não encontrado" });

  await prisma.produtos.delete({ where: { id } });
  res.json({ mensagem: "Produto removido com sucesso", produto: produtoExistente });
});

//
// ROTAS DE PEDIDOS
//
app.get("/pedidos", async (req, res) => {
  const pedidos = await prisma.pedidos.findMany({
    include: { itens: true, status: true, payments: { include: { typePayment: true } } },
  });
  res.json(pedidos);
});

app.get("/pedidos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const pedido = await prisma.pedidos.findUnique({
    where: { id },
    include: { itens: true, status: true, payments: { include: { typePayment: true } } },
  });
  if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado" });
  res.json(pedido);
});

// todo pedido precisa ter cliente, status default = AGUARDANDO PAGAMENTO
app.post("/pedidos", async (req, res) => {
  const { id_client, itens } = req.body;
  if (!id_client || !itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "Cliente e itens são obrigatórios" });
  }

  try {
    const novoPedido = await prisma.$transaction(async (prisma) => {
      let valorTotalPedido = 0;

      const cliente = await prisma.clients.findUnique({ where: { id: id_client } });
      if (!cliente) throw { status: 400, message: "Cliente não encontrado" };

      // pega status default
      const statusDefault = await prisma.status.findFirst({ where: { name: "AGUARDANDO PAGAMENTO" } });
      const pedido = await prisma.pedidos.create({ data: { id_client, id_status: statusDefault.id } });

      for (const item of itens) {
        const produto = await prisma.produtos.findUnique({ where: { id: item.idProduto } });
        if (!produto) throw { status: 400, message: `Produto ${item.idProduto} não existe` };
        if (produto.estoque < item.quantidade) throw { status: 400, message: `Estoque insuficiente para ${produto.nome}` };

        const valorUnit = produto.preco;
        const valorTotal = valorUnit * item.quantidade;
        valorTotalPedido += valorTotal;

        await prisma.pedido_Produto.create({
          data: {
            pedidoId: pedido.id,
            produtoId: item.idProduto,
            quantidade: item.quantidade,
            valorUnit,
            valorTotal,
          },
        });

        await prisma.produtos.update({
          where: { id: item.idProduto },
          data: { estoque: { decrement: item.quantidade } },
        });
      }

      await prisma.pedidos.update({
        where: { id: pedido.id },
        data: { valorTotal: valorTotalPedido },
      });

      return pedido;
    });

    res.status(201).json(novoPedido);
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || "Erro interno" });
  }
});

//
// PAGAMENTOS
//

// confirma pagamento com Math.random()
app.post("/orders/:id/payments/confirm", async (req, res) => {
  const id = parseInt(req.params.id);
  const { pagamentos } = req.body; 

  const pedido = await prisma.pedidos.findUnique({ where: { id } });
  if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado" });

  try {
    for (const p of pagamentos) {
      const sucesso = Math.random() > 0.3; 
      await prisma.orderPayments.create({
        data: { id_order: id, id_type_payment: p.id_type_payment, total: p.total },
      });

      if (!sucesso) {
        const statusFail = await prisma.status.findFirst({ where: { name: "CANCELADO" } });
        await prisma.pedidos.update({ where: { id }, data: { id_status: statusFail.id } });
        return res.json({ mensagem: "Falha no pagamento, pedido cancelado" });
      }
    }

    const statusPago = await prisma.status.findFirst({ where: { name: "PAGO" } });
    await prisma.pedidos.update({ where: { id }, data: { id_status: statusPago.id } });
    res.json({ mensagem: "Pagamento confirmado e pedido pago" });
  } catch (err) {
    res.status(500).json({ erro: "Erro no processamento do pagamento" });
  }
});

// buscar métodos de pagamento de um pedido
app.get("/orders/:id/payments", async (req, res) => {
  const id = parseInt(req.params.id);
  const pagamentos = await prisma.orderPayments.findMany({
    where: { id_order: id },
    include: { typePayment: true },
  });
  res.json(pagamentos);
});

//
// INICIA O SERVIDOR
//
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
