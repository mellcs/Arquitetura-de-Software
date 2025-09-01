const express = require("express");
const { PrismaClient } = require("@prisma/client");
const app = express();
const PORT = 3000;

const prisma = new PrismaClient();
app.use(express.json());

//
// ROTAS DE PRODUTOS
//

// GET /produtos → lista todos
app.get("/produtos", async (req, res) => {
  const produtos = await prisma.produtos.findMany();
  res.json(produtos);
});

// GET /produtos/:id → busca pelo ID
app.get("/produtos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const produto = await prisma.produtos.findUnique({ where: { id } });
  if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });
  res.json(produto);
});

// POST /produtos → adiciona novo
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

// PUT /produtos/:id → atualiza
app.put("/produtos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, preco, estoque } = req.body;

  const produtoExistente = await prisma.produtos.findUnique({ where: { id } });
  if (!produtoExistente) return res.status(404).json({ erro: "Produto não encontrado" });

  const produtoAtualizado = await prisma.produtos.update({
    where: { id },
    data: {
      nome: nome ?? produtoExistente.nome,
      preco: preco ?? produtoExistente.preco,
      estoque: estoque ?? produtoExistente.estoque,
    },
  });

  res.json(produtoAtualizado);
});

// DELETE /produtos/:id → remove
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

// GET /pedidos → lista todos
app.get("/pedidos", async (req, res) => {
  const pedidos = await prisma.pedidos.findMany({ include: { itens: true } });
  res.json(pedidos);
});

// POST /pedidos → cria novo
// Corpo esperado: { itens: [ { idProduto, quantidade } ] }
app.post("/pedidos", async (req, res) => {
  const { itens } = req.body;
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "O pedido deve conter itens" });
  }

  try {
    const novoPedido = await prisma.$transaction(async (prisma) => {
      let valorTotalPedido = 0;

      // valida estoque e calcula valores
      for (const item of itens) {
        const produto = await prisma.produtos.findUnique({ where: { id: item.idProduto } });
        if (!produto) throw { status: 400, message: `Produto ${item.idProduto} não existe` };
        if (produto.estoque < item.quantidade) throw { status: 400, message: `Estoque insuficiente para ${produto.nome}` };
      }

      // cria pedido vazio
      const pedido = await prisma.pedidos.create({ data: {} });

      // cria itens e atualiza estoque
      for (const item of itens) {
        const produto = await prisma.produtos.findUnique({ where: { id: item.idProduto } });
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

      // atualiza valor total do pedido
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

// GET /pedidos/:id → busca pedido específico
app.get("/pedidos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const pedido = await prisma.pedidos.findUnique({
    where: { id },
    include: { itens: true },
  });
  if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado" });
  res.json(pedido);
});

//
// INICIA O SERVIDOR
//
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
