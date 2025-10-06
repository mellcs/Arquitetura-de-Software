const express = require('express');
const axios = require('./config/axios'); // para consultar order-service
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const PREFIX = '/client-service/v1';

app.use(express.json());

// banco de dados em memória
let clientes = [
  { id: 'cliente-1', nome: 'Maria', email: 'maria@example.com' }
];

// =========================
//  Cadastrar cliente
// =========================
app.post(`${PREFIX}/clientes`, (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ message: 'nome e email obrigatórios' });
  }

  const novo = { id: uuidv4(), nome, email };
  clientes.push(novo);
  res.status(201).json(novo);
});

// =========================
//  Listar todos os clientes
// =========================
app.get(`${PREFIX}/clientes`, (req, res) => {
  if (clientes.length === 0) {
    return res.status(200).json({ message: 'Nenhum cliente cadastrado.' });
  }
  res.json(clientes);
});

// =========================
//  Buscar cliente por ID
// =========================
app.get(`${PREFIX}/clientes/:id`, (req, res) => {
  const c = clientes.find(x => x.id === req.params.id);
  if (!c) {
    return res.status(404).json({ message: 'Cliente não encontrado' });
  }
  res.json(c);
});

// =========================
//  Deletar cliente por ID
// =========================
app.delete(`${PREFIX}/clientes/:id`, (req, res) => {
  const clienteId = req.params.id;
  const index = clientes.findIndex(x => x.id === clienteId);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
  }

  const removido = clientes.splice(index, 1)[0];

  res.status(200).json({
    success: true,
    message: `Cliente ${removido.nome} removido com sucesso.`,
    data: removido
  });
});


// =========================
//  Buscar pedidos de um cliente (usa order-service)
// =========================
app.get(`${PREFIX}/clientes/:id/pedidos`, async (req, res) => {
  const clienteId = req.params.id;

  try {
    const resp = await axios.get(`/order-service/v1/pedidos`);
    const pedidosDoCliente = resp.data.filter(p => p.clienteId === clienteId);

    if (!pedidosDoCliente || pedidosDoCliente.length === 0) {
      return res.status(200).json({ message: 'Nenhum pedido encontrado para este cliente.' });
    }

    res.json(pedidosDoCliente);
  } catch (err) {
    console.error('[Client Service] Erro ao buscar pedidos:', err.message);
    res.status(500).json({ message: 'Erro ao consultar pedidos' });
  }
});

// =========================
//  Notificar cliente (simulação)
// =========================
app.post(`${PREFIX}/clientes/:id/notify`, (req, res) => {
  const cliente = clientes.find(x => x.id === req.params.id);
  if (!cliente) {
    return res.status(404).json({ message: 'Cliente não encontrado' });
  }

  const { message } = req.body;
  console.log(`[Client Service] Notificação para ${cliente.email}: ${message}`);
  res.json({ ok: true });
});

// =========================
//  Inicialização
// =========================
app.listen(PORT, () => {
  console.log(`[Client Service] rodando em ${PORT}`);
});
