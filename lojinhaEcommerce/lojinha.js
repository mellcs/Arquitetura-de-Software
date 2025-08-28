const express = require("express");
const app = express();
const PORT = 3000;

// Isso aqui deixa o Node entender quando a gente manda JSON no corpo da requisição
app.use(express.json());

// configuração do sequelize
const { Sequelize, DataTypes } = require("sequelize");

// conexão com banco relacional
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite" 
});

// definição do modelo Produto
const Produto = sequelize.define("Produto", {
  nome: { type: DataTypes.STRING, allowNull: false },
  preco: { type: DataTypes.FLOAT, allowNull: false },
  estoque: { type: DataTypes.INTEGER, allowNull: false }
});

// definição do modelo Pedido
const Pedido = sequelize.define("Pedido", {
  data: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }
});

// tabela intermediária PedidoItens (relação N:N entre pedidos e produtos)
const PedidoItem = sequelize.define("PedidoItem", {
  quantidade: { type: DataTypes.INTEGER, allowNull: false }
});

// relacionamentos
Pedido.belongsToMany(Produto, { through: PedidoItem });
Produto.belongsToMany(Pedido, { through: PedidoItem });

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

//DELETE /produtos/:id → remove um produto específico 
app.delete("/produtos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = produtos.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }
  const produtoRemovido = produtos.splice(index, 1); // remove da lista
  res.json({ mensagem: "Produto removido com sucesso", produto: produtoRemovido[0] });
});

// GET /pedidos → lista todos os pedidos
app.get("/pedidos", (req, res) => {
  res.json(pedidos);
});

// POST /pedidos → cria um novo pedido
// precisa mandar no corpo: { itens: [ { idProduto, quantidade } ] }
app.post("/pedidos", (req, res) => {
  const { itens } = req.body;
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "O pedido deve conter itens" });
  }

  // verifica se todos os produtos têm estoque suficiente
  for (let item of itens) {
    const produto = produtos.find(p => p.id === item.idProduto);
    if (!produto) {
      return res.status(400).json({ erro: `Produto ${item.idProduto} não existe` });
    }
    if (produto.estoque < item.quantidade) {
      return res.status(400).json({ erro: `Estoque insuficiente para ${produto.nome}` });
    }
  }

  // se passou, cria o pedido e decrementa estoque
  for (let item of itens) {
    const produto = produtos.find(p => p.id === item.idProduto);
    produto.estoque -= item.quantidade;
  }

  const novoPedido = {
    id: pedidos.length ? pedidos[pedidos.length - 1].id + 1 : 1,
    itens,
    data: new Date()
  };

  pedidos.push(novoPedido);

  res.status(201).json(novoPedido);
});

//GET /pedidos/:id → busca um pedido específico pelo ID
app.get("/pedidos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const pedido = pedidos.find(p => p.id === id);
  if (!pedido) {
    return res.status(404).json({ erro: "Pedido não encontrado" });
  }
  res.json(pedido);
});

// Inicia o servidor
// Agora a gente consegue acessar a lojinha pelo http://localhost:3000, sincroniza os models com o banco
app.listen(PORT, async () => {
  try {
    await sequelize.sync();
    console.log("Banco sincronizado com sucesso!");
  } catch (err) {
    console.error("Erro ao sincronizar banco:", err);
  }
  console.log(`Servidor rodando na porta ${PORT}`);
});

