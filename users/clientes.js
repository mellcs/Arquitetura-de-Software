const express = require("express");
const router = express.Router();
const { prisma } = require("./prisma/client");

// POST /clients
router.post("/", async (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ error: "nome e email são obrigatórios" });
  }

  try {
    const cliente = await prisma.cliente.create({ data: { nome, email } });
    res.status(201).json(cliente);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Este email já está cadastrado" });
    }
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
});

// GET /clients
router.get("/", async (req, res) => {
  const clientes = await prisma.cliente.findMany();
  res.json(clientes);
});

module.exports = router;
