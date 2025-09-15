const express = require("express");
const router = express.Router();
const { prisma } = require("../prisma/client");

// Criar pedido
router.post("/", async (req, res) => {
  const { clienteId, itens } = req.body;
  if (!clienteId || !Array.isArray(itens) || itens.length === 0)
    return res.status(400).json({ error: "clienteId e itens obrigatórios" });

  const cliente = await prisma.cliente.findUnique({ where: { id: Number(clienteId) }});
  if (!cliente) return res.status(400).json({ error: "Cliente não encontrado" });

  try {
    const result = await prisma.$transaction(async (prismaTx) => {
      let total = 0;

      for (const it of itens) {
        const prod = await prismaTx.produto.findUnique({ where: { id: Number(it.produtoId) }});
        if (!prod) throw { status: 400, message: `Produto ${it.produtoId} não existe` };
        if (prod.estoque < Number(it.quantidade)) throw { status: 400, message: `Sem estoque suficiente para produto ${prod.nome}` };

        total += prod.preco * Number(it.quantidade);
      }

      const pedido = await prismaTx.pedido.create({ data: { clienteId: Number(clienteId), status: "AGUARDANDO_PAGAMENTO", valorTotal: total }});

      for (const it of itens) {
        await prismaTx.pedidoItem.create({
          data: {
            pedidoId: pedido.id,
            produtoId: Number(it.produtoId),
            quantidade: Number(it.quantidade),
            precoUnit: (await prismaTx.produto.findUnique({ where: { id: Number(it.produtoId) }})).preco
          }
        });
        await prismaTx.produto.update({
          where: { id: Number(it.produtoId) },
          data: { estoque: (await prismaTx.produto.findUnique({ where: { id: Number(it.produtoId) }})).estoque - Number(it.quantidade) }
        });
      }

      return pedido;
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Erro ao criar pedido" });
  }
});

// Listar pedidos
router.get("/", async (req, res) => {
  const pedidos = await prisma.pedido.findMany({ include: { itens: { include: { produto: true } }, cliente: true, pagamentos: true }});
  res.json(pedidos);
});

// Buscar pedido por id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const p = await prisma.pedido.findUnique({ where: { id }, include: { itens: { include: { produto: true } }, cliente: true, pagamentos: true }});
  if (!p) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json(p);
});

module.exports = router;
