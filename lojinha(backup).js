// lojinha.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bodyParser = require("body-parser");

const prisma = new PrismaClient();
const app = express();
app.use(bodyParser.json());

/* --- PRODUTOS --- */
// Listar produtos (ignorando deletados)
app.get("/produtos", async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { deletado: false }
    });
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar produtos" });
  }
});

// Buscar produto por id
app.get("/produtos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await prisma.produto.findUnique({ where: { id } });
    if (!p || p.deletado) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

// Criar produto
app.post("/produtos", async (req, res) => {
  try {
    const { nome, preco, estoque } = req.body;
    if (!nome || preco == null || estoque == null)
      return res.status(400).json({ error: "Faltam campos" });

    const novo = await prisma.produto.create({ 
      data: { nome, preco: Number(preco), estoque: Number(estoque) } 
    });
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});

// Atualizar produto (não altera estoque)
app.put("/produtos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, preco } = req.body;
    const produto = await prisma.produto.findUnique({ where: { id } });
    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });

    const atualizado = await prisma.produto.update({
      where: { id },
      data: {
        nome: nome ?? produto.nome,
        preco: preco != null ? Number(preco) : produto.preco
      }
    });
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

// Ajustar estoque
app.patch("/produtos/:id/estoque", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { estoque } = req.body;
    if (estoque == null) return res.status(400).json({ error: "Informe estoque" });

    const p = await prisma.produto.update({ 
      where: { id }, 
      data: { estoque: Number(estoque) } 
    });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar estoque" });
  }
});

// Deletar produto (virtual)
app.delete("/produtos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const produto = await prisma.produto.findUnique({ where: { id } });
    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });

    // Marca como deletado
    await prisma.produto.update({ where: { id }, data: { deletado: true } });
    res.status(200).json({ message: `O produto "${produto.nome}" não está mais disponível.` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar produto" });
  }
});

/* --- CLIENTES --- */
// Criar cliente
app.post("/clientes", async (req, res) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) return res.status(400).json({ error: "nome/email obrigatórios" });

    const c = await prisma.cliente.create({ data: { nome, email } });
    res.status(201).json(c);
  } catch (err) {
    if (err.code === "P2002") { // Prisma unique constraint
      return res.status(400).json({ error: "Este email já está cadastrado" });
    }
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
});

// Listar clientes
app.get("/clientes", async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany();
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar clientes" });
  }
});
// Deletar cliente por id
app.delete("/clientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cliente = await prisma.cliente.findUnique({ where: { id }});
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

    await prisma.cliente.delete({ where: { id }});
    res.status(200).json({ message: `Cliente "${cliente.nome}" foi deletado com sucesso.` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar cliente" });
  }
});


// Listar pedidos de um cliente
app.get("/clientes/:id/pedidos", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pedidos = await prisma.pedido.findMany({
      where: { clienteId: id },
      include: { itens: { include: { produto: true } }, pagamentos: true }
    });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar pedidos do cliente" });
  }
});

/* --- PEDIDOS --- */
// Criar pedido
app.post("/pedidos", async (req, res) => {
  try {
    const { clienteId, itens } = req.body;
    if (!clienteId || !Array.isArray(itens) || itens.length === 0)
      return res.status(400).json({ error: "clienteId e itens obrigatórios" });

    const cliente = await prisma.cliente.findUnique({ where: { id: Number(clienteId) }});
    if (!cliente) return res.status(400).json({ error: "Cliente não encontrado" });

    const result = await prisma.$transaction(async (prismaTx) => {
      // Validar estoque
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
          valorTotal: 0
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
            precoUnit
          }
        });
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
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.status && err.message) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Erro ao criar pedido", details: err.message || err });
    }
  }
});

// Listar todos os pedidos
app.get("/pedidos", async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: { itens: { include: { produto: true } }, cliente: true, pagamentos: true }
    });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
});

// Buscar pedido por id
app.get("/pedidos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await prisma.pedido.findUnique({
      where: { id },
      include: { itens: { include: { produto: true } }, cliente: true, pagamentos: true }
    });
    if (!p) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pedido" });
  }
});

/* --- PAGAMENTO (simulado) --- */
// Registrar pagamento
app.post("/pedidos/:id/pagamento", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { metodos } = req.body;
    const pedido = await prisma.pedido.findUnique({ where: { id }});
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    let allSuccess = true;
    for (const m of metodos) {
      const sucesso = Math.random() > 0.2;
      await prisma.pagamento.create({
        data: { pedidoId: id, metodo: m.metodo, valor: Number(m.valor), sucesso }
      });
      if (!sucesso) allSuccess = false;
    }

    const novoStatus = allSuccess ? "PAGO" : "CANCELADO";
    await prisma.pedido.update({ where: { id }, data: { status: novoStatus }});
    res.json({ status: novoStatus });
  } catch (err) {
    res.status(500).json({ error: "Erro ao registrar pagamento" });
  }
});

// Listar pagamentos de um pedido// Listar pagamentos de um pedido
app.get("/pedidos/:id/pagamentos", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pagamentos = await prisma.pagamento.findMany({ where: { pedidoId: id }});
    res.json(pagamentos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar pagamentos" });
  }
});

/* --- START SERVER --- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
