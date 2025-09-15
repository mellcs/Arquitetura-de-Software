// lojinha.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bodyParser = require("body-parser");

const prisma = new PrismaClient();
const app = express();
app.use(bodyParser.json());

/* --- PRODUTOS --- */
// Listar
app.get("/produtos", async (req, res) => {
  const produtos = await prisma.produto.findMany();
  res.json(produtos);
});

// Buscar por id
app.get("/produtos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const p = await prisma.produto.findUnique({ where: { id }});
  if (!p) return res.status(404).json({ error: "Produto não encontrado" });
  res.json(p);
});

// Criar
app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;
  if (!nome || preco == null || estoque == null)
    return res.status(400).json({ error: "Faltam campos" });
  const novo = await prisma.produto.create({ data: { nome, preco: Number(preco), estoque: Number(estoque) }});
  res.status(201).json(novo);
});

// Atualizar (não permite alterar estoque)
app.put("/produtos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, preco } = req.body;
  const produto = await prisma.produto.findUnique({ where: { id }});
  if (!produto) return res.status(404).json({ error: "Produto não encontrado" });
  const atualizado = await prisma.produto.update({
    where: { id },
    data: {
      nome: nome ?? produto.nome,
      preco: preco != null ? Number(preco) : produto.preco
    }
  });
  res.json(atualizado);
});

// Endpoint específico para ajustar estoque
app.patch("/produtos/:id/estoque", async (req, res) => {
  const id = Number(req.params.id);
  const { estoque } = req.body;
  if (estoque == null) return res.status(400).json({ error: "Informe estoque" });
  const p = await prisma.produto.update({ where:{ id }, data: { estoque: Number(estoque) }});
  res.json(p);
});

// Deletar
app.delete("/produtos/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.produto.delete({ where: { id }});
  res.status(204).send();
});

/* --- CLIENTES --- */
app.post("/clientes", async (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) return res.status(400).json({ error: "nome/email obrigatórios" });
  try {
    const c = await prisma.cliente.create({ data: { nome, email }});
    res.status(201).json(c);
  } catch (err) {
    res.status(400).json({ error: "Erro ao criar cliente", details: err.message });
  }
});

app.get("/clientes/:id/pedidos", async (req, res) => {
  const id = Number(req.params.id);
  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: id },
    include: { itens: { include: { produto: true } }, pagamentos: true }
  });
  res.json(pedidos);
});

/* --- PEDIDOS --- */
// Criar pedido (IMPORTANTE: operação transacional)
app.post("/pedidos", async (req, res) => {
  const { clienteId, itens } = req.body;
  if (!clienteId || !Array.isArray(itens) || itens.length === 0)
    return res.status(400).json({ error: "clienteId e itens obrigatórios" });

  // Validar cliente existe
  const cliente = await prisma.cliente.findUnique({ where: { id: Number(clienteId) }});
  if (!cliente) return res.status(400).json({ error: "Cliente não encontrado" });

  // Start transaction
  const result = await prisma.$transaction(async (prismaTx) => {
    // Checar estoque para cada item
    for (const it of itens) {
      const prod = await prismaTx.produto.findUnique({ where: { id: Number(it.produtoId) }});
      if (!prod) throw { status: 400, message: `Produto ${it.produtoId} não existe` };
      if (prod.estoque < Number(it.quantidade)) {
        throw { status: 400, message: `Sem estoque suficiente para produto ${prod.nome}` };
      }
    }

    // Criar pedido
    const pedido = await prismaTx.pedido.create({
      data: {
        clienteId: Number(clienteId),
        status: "AGUARDANDO_PAGAMENTO",
        valorTotal: 0 // atualizamos depois
      }
    });

    // Criar itens e decrementar estoque
    let total = 0;
    for (const it of itens) {
      const prod = await prismaTx.produto.findUnique({ where: { id: Number(it.produtoId) }});
      const precoUnit = prod.preco;
      await prismaTx.pedidoItem.create({
        data: {
          pedidoId: pedido.id,
          produtoId: prod.id,
          quantidade: Number(it.quantidade),
          precoUnit: precoUnit
        }
      });
      // decrementar estoque
      await prismaTx.produto.update({
        where: { id: prod.id },
        data: { estoque: prod.estoque - Number(it.quantidade) }
      });
      total += precoUnit * Number(it.quantidade);
    }

    // Atualizar valorTotal
    const pedidoFinal = await prismaTx.pedido.update({
      where: { id: pedido.id },
      data: { valorTotal: total },
      include: { itens: true }
    });

    return pedidoFinal;
  }).catch(err => { throw err; });

  // Se chegou aqui, tudo bem
  res.status(201).json(result);
});

// Buscar pedidos (todos)
app.get("/pedidos", async (req, res) => {
  const pedidos = await prisma.pedido.findMany({ include: { itens: { include: { produto: true } }, cliente: true, pagamentos: true }});
  res.json(pedidos);
});

// Buscar pedido por id
app.get("/pedidos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const p = await prisma.pedido.findUnique({ where: { id }, include: { itens: { include: { produto: true } }, cliente: true, pagamentos: true }});
  if (!p) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json(p);
});

/* --- PAGAMENTO (simulado) --- */
// Enviar métodos de pagamento para confirmar
app.post("/pedidos/:id/pagamento", async (req, res) => {
  const id = Number(req.params.id);
  const { metodos } = req.body; // exemplo: [{metodo: "boleto", valor: 30}, {metodo:"cartao", valor:10}]
  const pedido = await prisma.pedido.findUnique({ where: { id }});
  if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

  // Simular pagamentos: se qualquer um falhar -> CANCELADO
  let allSuccess = true;
  for (const m of metodos) {
    const sucesso = Math.random() > 0.2; // 80% de sucesso (ajuste conforme quiser)
    await prisma.pagamento.create({
      data: { pedidoId: id, metodo: m.metodo, valor: Number(m.valor), sucesso }
    });
    if (!sucesso) allSuccess = false;
  }

  const novoStatus = allSuccess ? "PAGO" : "CANCELADO";
  await prisma.pedido.update({ where: { id }, data: { status: novoStatus }});
  res.json({ status: novoStatus });
});

// Buscar métodos de pagamento de um pedido
app.get("/pedidos/:id/pagamentos", async (req, res) => {
  const id = Number(req.params.id);
  const pagamentos = await prisma.pagamento.findMany({ where: { pedidoId: id }});
  res.json(pagamentos);
});

/* --- START SERVER --- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
