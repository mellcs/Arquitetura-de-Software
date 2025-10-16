const express = require('express');
const axios = require('./config/axios'); // axios singleton local
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const PREFIX = '/order-service/v1';

app.use(express.json());

// DB em memória
let pedidos = [
  {
    id: "1",
    clienteId: "cliente-1",
    clienteNome: "Cliente 1",
    status: "AGUARDANDO PAGAMENTO",
    valorTotal: 500,
    itens: [{ produtoId: "prod-abc", quantidade: 2 }]
  }
];

// =========================
//  Listar todos os pedidos
// =========================
app.get(`${PREFIX}/pedidos`, (req, res) => {
  res.json(pedidos);
});

// =========================
//  Buscar pedido por ID
// =========================
app.get(`${PREFIX}/pedidos/:id`, (req, res) => {
  const order = pedidos.find(p => p.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Pedido não encontrado.'});
  res.json(order);
});

// =========================
//  Criar pedido
// =========================
app.post(`${PREFIX}/pedidos`, async (req, res) => {
  const { clienteId, clienteNome, itens } = req.body;
  if (!clienteId || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ message: 'clienteId e itens são obrigatórios.'});
  }

  try {
    // validar estoque consultando product-service
    for (const item of itens) {
      const resp = await axios.get(`/product-service/v1/produtos/${item.produtoId}`);
      const produto = resp.data;
      if (!produto) return res.status(404).json({ message: `Produto ${item.produtoId} não encontrado.`});
      if (produto.estoque < item.quantidade) return res.status(400).json({ message: `Estoque insuficiente para produto ${item.produtoId}.`});
    }

    // criar pedido
    const novo = {
      id: uuidv4(),
      clienteId,
      clienteNome: clienteNome || 'Cliente',
      status: "AGUARDANDO PAGAMENTO",
      itens,
      valorTotal: 0
    };

    // calcular valorTotal
    let total = 0;
    for (const item of itens) {
      const resp = await axios.get(`/product-service/v1/produtos/${item.produtoId}`);
      total += resp.data.preco * item.quantidade;
    }
    novo.valorTotal = total;

    // decrementar estoque
    for (const item of itens) {
      await axios.post(`/product-service/v1/produtos/${item.produtoId}/estoque`, { delta: -item.quantidade });
    }

    pedidos.push(novo);
    return res.status(201).json(novo);

  } catch (err) {
    console.error('[Order Service] Erro ao criar pedido:', err.message || err);
    return res.status(500).json({ message: 'Erro interno ao criar pedido', error: err.message });
  }
});

// =========================
//  Atualizar status do pedido
// =========================
app.patch(`${PREFIX}/pedidos/:id/status`, async (req, res) => {
  const order = pedidos.find(p => p.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Pedido não encontrado.'});
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'status é obrigatório.'});

  order.status = status;

  // se status for CANCELADO, devolver estoque
  if (status === 'CANCELADO') {
    try {
      for (const item of order.itens) {
        await axios.post(`/product-service/v1/produtos/${item.produtoId}/estoque`, { delta: item.quantidade });
        console.log(`[Order Service] Estoque devolvido para produto ${item.produtoId} (quantidade ${item.quantidade})`);
      }
    } catch (err) {
      console.error('[Order Service] Erro ao devolver estoque:', err.message || err);
    }
  }

  return res.json(order);
});

// =========================
//  Deletar pedido por ID
// =========================
app.delete(`${PREFIX}/pedidos/:id`, (req, res) => {
  const pedidoId = req.params.id;
  const index = pedidos.findIndex(p => p.id === pedidoId);

  if (index === -1) return res.status(404).json({ message: 'Pedido não encontrado.' });

  const removido = pedidos[index];
  pedidos.splice(index, 1);

  return res.status(200).json({
    message: `Pedido ${removido.id} removido com sucesso.`,
    pedidoRemovido: removido
  });
});

// =========================
//  Inicialização
// =========================
app.listen(PORT, () => {
  console.log(`[Order Service] Rodando na porta ${PORT}`);
});
