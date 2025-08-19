const express = require("express");
const app = express();
const PORT = 3000;

// Isso aqui deixa o Node entender quando a gente manda JSON no corpo da requisição
app.use(express.json());

// Banco de dados na memória, ou seja, só vai durar enquanto o servidor estiver ligado
let produtos = [
  { id: 1, nome: "Hamster Sírio", preco: 120, estoque: 3 },
  { id: 2, nome: "Hamster Anão", preco: 90, estoque: 5 }
];

// GET /produtos → lista todos os produtos
// Tipo, só pra ver o que tem na lojinha
app.get("/produtos", (req, res) => {
  res.json(produtos);
});

// GET /produtos/:id → busca um produto pelo ID
// Você coloca um número e ele tenta achar o produto, se não achar, reclama
app.get("/produtos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const produto = produtos.find(p => p.id === id);
  if (!produto) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }
  res.json(produto);
});

// POST /produtos → adiciona um novo produto
// Aqui a gente coloca um produto novo, precisa dizer nome, preço e estoque
app.post("/produtos", (req, res) => {
  const { nome, preco, estoque } = req.body;
  if (!nome || preco == null || estoque == null) {
    return res.status(400).json({ erro: "Campos obrigatórios: nome, preco, estoque" });
  }
  const novoProduto = {
    id: produtos.length ? produtos[produtos.length - 1].id + 1 : 1, // cria ID automático
    nome,
    preco,
    estoque
  };
  produtos.push(novoProduto); // coloca na lista
  res.status(201).json(novoProduto);
});

// PUT /produtos/:id → atualiza um produto existente
// Se quiser mudar o nome, preço ou estoque de um produto que já existe
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
// Agora a gente consegue acessar a lojinha pelo http://localhost:3000
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
