const express = require("express");
const router = express.Router();
const { prisma } = require("./prisma/client");

// POST /products
router.post("/", async (req, res) => {
  const { nome, preco, estoque } = req.body;
  if (!nome || preco == null || estoque == null) {
    return res.status(400).json({ error: "Faltam campos obrigatórios" });
  }
  const novo = await prisma.produto.create({
    data: { nome, preco: Number(preco), estoque: Number(estoque) }
  });
  res.status(201).json(novo);
});

// GET /products
router.get("/", async (req, res) => {
  const produtos = await prisma.produto.findMany({ where: { deletado: false } });
  res.json(produtos);
});

// GET /products/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto || produto.deletado) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }
  res.json(produto);
});

// PATCH /products/:id
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, preco } = req.body;
  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto || produto.deletado) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }
  const atualizado = await prisma.produto.update({
    where: { id },
    data: {
      nome: nome ?? produto.nome,
      preco: preco != null ? Number(preco) : produto.preco
    }
  });
  res.json(atualizado);
});

// PATCH /products/:id/stock
router.patch("/:id/stock", async (req, res) => {
  const id = Number(req.params.id);
  const { estoque } = req.body;
  if (estoque == null) {
    return res.status(400).json({ error: "Informe o estoque" });
  }
  const produto = await prisma.produto.update({
    where: { id },
    data: { estoque: Number(estoque) }
  });
  res.json(produto);
});

// DELETE /products/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto || produto.deletado) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }
  await prisma.produto.update({
    where: { id },
    data: { deletado: true }
  });
  res.json({ message: `O produto "${produto.nome}" foi removido.` });
});

module.exports = router;
