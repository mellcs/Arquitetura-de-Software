//adição do prisma em tudo, basicamente. pega tudo daquele banco de dados.

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const app = express();
const PORT = 3000;

//prisma client
const prisma = new PrismaClient();

// Isso aqui deixa o Node entender quando a gente manda JSON no corpo da requisição
app.use(express.json());

// GET /produtos → lista todos os produtos
//usa o prisma pra pegar os produtos
app.get("/produtos", async (req, res) => {
  const produtos = await prisma.produto.findMany();
  res.json(produtos);
});

// GET /produtos/:id → busca um produto pelo ID
// Você coloca um número e ele tenta achar o produto, se não achar, reclama 
app.get("/produtos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }
  res.json(produto);
});

// POST /produtos → adiciona um novo produto
// Aqui a gente coloca um produto novo, precisa dizer nome, preço e estoque. 
app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;
  if (!nome || preco == null || estoque == null) {
    return res.status(400).json({ erro: "Campos obrigatórios: nome, preco, estoque" });
  }
  const novoProduto = await prisma.produto.create({
    data: { nome, preco, estoque },
  });
  res.status(201).json(novoProduto);
});

// PUT /produtos/:id → atualiza um produto existente
// Se quiser mudar o nome, preço ou estoque de um produto que já existe.
app.put("/produtos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, preco, estoque } = req.body;

  const produtoExistente = await prisma.produto.findUnique({ where: { id } });
  if (!produtoExistente) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }

  const produtoAtualizado = await prisma.produto.update({
    where: { id },
    data: {
      nome: nome !== undefined ? nome : produtoExistente.nome,
      preco: preco !== undefined ? preco : produtoExistente.preco,
      estoque: estoque !== undefined ? estoque : produtoExistente.estoque,
    },
  });

  res.json(produtoAtualizado);
});

// DELETE /produtos/:id → remove um produto específico
app.delete("/produtos/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  const produtoExistente = await prisma.produto.findUnique({ where: { id } });
  if (!produtoExistente) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }

  await prisma.produto.delete({ where: { id } });
  res.json({ mensagem: "Produto removido com sucesso", produto: produtoExistente });
});

// GET /pedidos → lista todos os pedidos
app.get("/pedidos", async (req, res) => {
  const pedidos = await prisma.pedido.findMany({ include: { itens: true } });
  res.json(pedidos);
});

// POST /pedidos → cria um novo pedido
// precisa mandar no corpo: { itens: [ { idProduto, quantidade } ] }
app.post("/pedidos", async (req, res) => {
  const { itens } = req.body;
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "O pedido deve conter itens" });
  }

  try {
    const novoPedido = await prisma.$transaction(async (prisma) => {
      // verifica estoque
      for (const item of itens) {
        const produto = await prisma.produto.findUnique({ where: { id: item.idProduto } });
        if (!produto) throw { status: 400, message: `Produto ${item.idProduto} não existe` };
        if (produto.estoque < item.quantidade) throw { status: 400, message: `Estoque insuficiente para ${produto.nome}` };
      }

      // cria pedido
      const pedido = await prisma.pedido.create({ data: {} });

      // cria itens e decrementa estoque
      for (const item of itens) {
        await prisma.itemPedido.create({
          data: {
            pedidoId: pedido.id,
            produtoId: item.idProduto,
            quantidade: item.quantidade,
          },
        });
        await prisma.produto.update({
          where: { id: item.idProduto },
          data: { estoque: { decrement: item.quantidade } },
        });
      }

      return pedido;
    });

    res.status(201).json(novoPedido);
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || "Erro interno" });
  }
});

// GET /pedidos/:id → busca um pedido específico pelo ID
app.get("/pedidos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { itens: true },
  });
  if (!pedido) {
    return res.status(404).json({ erro: "Pedido não encontrado" });
  }
  res.json(pedido);
});

// Inicia o servidor
// Agora a gente consegue acessar a lojinha pelo http://localhost:3000
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
