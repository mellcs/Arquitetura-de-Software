const express = require("express");
const router = express.Router();
const { prisma } = require("../prisma/client");

// Criar cliente
router.post("/", async (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) return res.status(400).json({ error: "nome/email obrigatórios" });
  try {
    const c = await prisma.cliente.create({ data: { nome, email }});
    res.status(201).json(c);
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ error: "Este email já está cadastrado" });
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
});

// Listar clientes
router.get("/", async (req, res) => {
  const clientes = await prisma.cliente.findMany();
  res.json(clientes);
});

// Deletar cliente
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cliente = await prisma.cliente.findUnique({ where: { id }});
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
    await prisma.cliente.delete({ where: { id }});
    res.json({ message: `Cliente "${cliente.nome}" deletado.` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar cliente" });
  }
});

module.exports = router;
