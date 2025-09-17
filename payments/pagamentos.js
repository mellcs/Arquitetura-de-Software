const express = require("express");
const router = express.Router();
const { prisma } = require("../prisma/client");

// POST /payments
router.post("/", async (req, res) => {
  const { pedidoId, metodo, valor } = req.body;

  if (!pedidoId || !metodo || !valor) {
    return res.status(400).json({ error: "pedidoId, metodo e valor são obrigatórios" });
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: Number(pedidoId) } });
  if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

  try {
    const pagamento = await prisma.pagamento.create({
      data: {
        pedidoId: Number(pedidoId),
        metodo,
        valor: Number(valor),
        sucesso: false, // só vai ser processado depois
      },
    });

    res.status(201).json(pagamento);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

// PATCH /payments/:id/process
router.patch("/:id/process", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const pagamento = await prisma.pagamento.findUnique({ where: { id } });
    if (!pagamento) return res.status(404).json({ error: "Pagamento não encontrado" });

    // simulação de processamento (80% chance de sucesso)
    const sucesso = Math.random() > 0.2;

    const atualizado = await prisma.pagamento.update({
      where: { id },
      data: { sucesso },
    });

    // Atualizar status do pedido conforme resultado
    const pagamentos = await prisma.pagamento.findMany({ where: { pedidoId: atualizado.pedidoId } });
    const todosSucesso = pagamentos.every((p) => p.sucesso === true);

    await prisma.pedido.update({
      where: { id: atualizado.pedidoId },
      data: { status: todosSucesso ? "PAGO" : "CANCELADO" },
    });

    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao processar pagamento" });
  }
});

module.exports = router;
