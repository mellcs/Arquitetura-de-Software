const express = require("express");
const app = express();
const PORT = 3000;

// Middleware para entender JSON no corpo das requisições
app.use(express.json());

// Simulação de banco de dados em memória
let produtos = [
  { id: 1, nome: "Hamster Sírio", preco: 120, estoque: 3 },
  { id: 2, nome: "Hamster Anão", preco: 90, estoque: 5 }
];

// GET /produtos → lista todos os produtos
app.get("/produtos", (req, res) => {
  res.json(produtos);
});

// GET /produtos/:id → busca um produto pelo ID
app.get("/produtos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const produto = produtos.find(p => p.id === id);
  if (!produto) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }
  res.json(produto);
});

// POST /produtos → adiciona um novo produto
app.post("/produtos", (req, res) => {
  const { nome, preco, estoque } = req.body;
  if (!nome || preco == null || estoque == null) {
    return res.status(400).json({ erro: "Campos obrigatórios: nome, preco, estoque" });
  }
  const novoProduto = {
    id: produtos.length ? produtos[produtos.length - 1].id + 1 : 1,
    nome,
    preco,
    estoque
  };
  produtos.push(novoProduto);
  res.status(201).json(novoProduto);
});

// PUT /produtos/:id → atualiza um produto existente
app.put("/produtos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const produto = produtos.find(p => p.id === id);
  if (!produto) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }

  const { nome, preco, estoque } = req.body;
  if (nome !== undefined) produto.nome = nome;
  if (preco !== undefined) produto.preco = preco;
  if (estoque !== undefined) produto.estoque = estoque;

  res.json(produto);
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
