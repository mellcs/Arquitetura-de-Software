const express = require('express');
const axios = require('./config/axios'); // para consultar orders se preciso
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const PREFIX = '/client-service/v1';

app.use(express.json());

let clientes = [
  { id: 'cliente-1', nome: 'Maria', email: 'maria@example.com' }
];

// Cadastrar cliente
app.post(`${PREFIX}/clientes`, (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) return res.status(400).json({ message: 'nome e email obrigatórios' });
  const novo = { id: uuidv4(), nome, email };
  clientes.push(novo);
  res.status(201).json(novo);
});

// Buscar cliente
app.get(`${PREFIX}/clientes/:id`, (req, res) => {
  const c = clientes.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ message: 'Cliente não encontrado' });
  res.json(c);
});

// Buscar pedidos de um cliente específico (chama order-service)
app.get(`${PREFIX}/clientes/:id/pedidos`, async (req, res) => {
  const clienteId = req.params.id;
  try {
    const resp = await axios.get(`/order-service/v1/pedidos`);
    const pedidosDoCliente = resp.data.filter(p => p.clienteId === clienteId);
    res.json(pedidosDoCliente);
  } catch (err) {
    console.error('[Client Service] Erro ao buscar pedidos:', err.message);
    res.status(500).json({ message: 'Erro ao consultar pedidos' });
  }
});

// endpoint simples para notificar cliente (simulação)
app.post(`${PREFIX}/clientes/:id/notify`, (req, res) => {
  const cliente = clientes.find(x => x.id === req.params.id);
  if (!cliente) return res.status(404).json({ message: 'Cliente não encontrado' });
  const { message } = req.body;
  console.log(`[Client Service] Notificação para ${cliente.email}: ${message}`);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`[Client Service] rodando em ${PORT}`));
