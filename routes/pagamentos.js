const express = require("express");
const router = express.Router();
const { prisma } = require("../prisma/client");

// Realizar pagamento de um pedido
router.post("/:id/pagamento", async (req, res) => {
  const id = Number(req.params.id);
  const { metodos } = req.body;

  const pedido = await prisma.pedido.findUnique({ where: { id }});
  if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

  let allSuccess = true;
  for (const m of metodos) {
    const sucesso = Math.random() > 0.2;
    await prisma.pagamento.create({ data: { pedidoId: id, metodo: m.metodo, valor: Number(m.valor), sucesso }});
    if (!sucesso) allSuccess = false;
  }

  const novoStatus = allSuccess ? "PAGO" : "CANCELADO";
  await prisma.pedido.update({ where: { id }, data: { status: novoStatus }});
  res.json({ status: novoStatus });
});

// Listar pagamentos de um pedido
router.get("/:id/pagamentos", async (req, res) => {
  const id = Number(req.params.id);
  const pagamentos = await prisma.pagamento.findMany({ where: { pedidoId: id }});
  res.json(pagamentos);
});

module.exports = router;
