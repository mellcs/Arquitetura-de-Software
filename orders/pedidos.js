const express = require("express");
const router = express.Router();
const { prisma } = require("../prisma/client");
const axios = require("axios"); // Para chamar o serviço de payments via HTTP

// Criar pedido -> POST /orders
router.post("/", async (req, res) => {
  const { clienteId, itens } = req.body;
  if (!clienteId || !Array.isArray(itens) || itens.length === 0)
    return res.status(400).json({ error: "clienteId e itens obrigatórios" });

  const cliente = await prisma.cliente.findUnique({ where: { id: Number(clienteId) }});
  if (!cliente) return res.status(400).json({ error: "Cliente não encontrado" });

  try {
    const result = await prisma.$transaction(async (prismaTx) => {
      let total = 0;

      // Validação e cálculo do total
      for (const it of itens) {
        const prod = await prismaTx.produto.findUnique({ where: { id: Number(it.produtoId) }});
        if (!prod) throw { status: 400, message: `Produto ${it.produtoId} não existe` };
        if (prod.estoque < Number(it.quantidade)) throw { status: 400, message: `Sem estoque suficiente para produto ${prod.nome}` };
        total += prod.preco * Number(it.quantidade);
      }

      // Criar pedido
      const pedido = await prismaTx.pedido.create({
        data: { clienteId: Number(clienteId), status: "AGUARDANDO_PAGAMENTO", valorTotal: total }
      });

      // Criar itens e atualizar estoque
      for (const it of itens) {
        const prod = await prismaTx.produto.findUnique({ where: { id: Number(it.produtoId) }});

        await prismaTx.pedidoItem.create({
          data: {
            pedidoId: pedido.id,
            produtoId: Number(it.produtoId),
            quantidade: Number(it.quantidade),
            precoUnit: prod.preco
          }
        });

        await prismaTx.produto.update({
          where: { id: Number(it.produtoId) },
          data: { estoque: prod.estoque - Number(it.quantidade) }
        });
      }

      return pedido;
    });

    // 🔹 Criação automática do pagamento pendente no serviço de payments
    try {
      await axios.post(`http://localhost:3002/payments`, {
        pedidoId: result.id,
        metodo: "PENDENTE", // pagamento ainda não processado
        valor: result.valorTotal
      });
    } catch (err) {
      console.error("Erro ao criar pagamento automático:", err.message);
      // Não impede o pedido de ser criado
    }

    res.status(201).json(result);

  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Erro ao criar pedido" });
  }
});

// Listar pedidos -> GET /orders
router.get("/", async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    include: {
      itens: { include: { produto: true } },
      cliente: true,
      pagamentos: true,
    }
  });
  res.json(pedidos);
});

// Buscar pedido por ID -> GET /orders/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const p = await prisma.pedido.findUnique({
    where: { id },
    include: {
      itens: { include: { produto: true } },
      cliente: true,
      pagamentos: true,
    }
  });
  if (!p) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json(p);
});

// Atualizar status do pedido -> PATCH /orders/:id/status
router.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status é obrigatório" });

  try {
    const pedido = await prisma.pedido.findUnique({ where: { id }});
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    const atualizado = await prisma.pedido.update({
      where: { id },
      data: { status }
    });

    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar status do pedido" });
  }
});

module.exports = router;
