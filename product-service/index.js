const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const PREFIX = '/product-service/v1';

app.use(express.json());

// DB em memória
let produtos = [
  { id: 'prod-abc', nome: 'Produto ABC', preco: 250, estoque: 10 },
  { id: 'prod-xyz', nome: 'Produto XYZ', preco: 100, estoque: 5 }
];

// GET /produtos
app.get(`${PREFIX}/produtos`, (req, res) => res.json(produtos));

// GET /produtos/:id
app.get(`${PREFIX}/produtos/:id`, (req, res) => {
  const p = produtos.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Produto não encontrado' });
  res.json(p);
});

// POST /produtos  -> { nome, preco, estoque }
app.post(`${PREFIX}/produtos`, (req, res) => {
  const { nome, preco, estoque } = req.body;
  if (!nome || preco == null || estoque == null) return res.status(400).json({ message: 'nome, preco e estoque obrigatórios' });
  const novo = { id: uuidv4(), nome, preco: Number(preco), estoque: Number(estoque) };
  produtos.push(novo);
  res.status(201).json(novo);
});

// PUT /produtos/:id -> atualiza tudo exceto estoque
app.put(`${PREFIX}/produtos/:id`, (req, res) => {
  const p = produtos.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Produto não encontrado' });
  const { nome, preco } = req.body;
  if (nome) p.nome = nome;
  if (preco != null) p.preco = Number(preco);
  res.json(p);
});

// DELETE /produtos/:id
app.delete(`${PREFIX}/produtos/:id`, (req, res) => {
  const idx = produtos.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Produto não encontrado' });
  produtos.splice(idx, 1);
  res.status(204).send();
});

// Endpoint para adicionar/remover estoque: POST /produtos/:id/estoque { delta: number }
app.post(`${PREFIX}/produtos/:id/estoque`, (req, res) => {
  const { delta } = req.body;
  if (delta == null) return res.status(400).json({ message: 'delta é obrigatório' });
  const p = produtos.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Produto não encontrado' });
  const novoEstoque = p.estoque + Number(delta);
  if (novoEstoque < 0) return res.status(400).json({ message: 'Estoque insuficiente' });
  p.estoque = novoEstoque;
  res.json(p);
});

app.listen(PORT, () => {
  console.log(`[Product Service] rodando na porta ${PORT}`);
});
