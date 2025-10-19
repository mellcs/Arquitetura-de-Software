const express = require('express');
const prisma = require('./config/prisma');
const axios = require('./config/axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

app.use(express.json());

const METODOS_VALIDOS = ['cartao_credito', 'debito', 'pix', 'dinheiro'];

// =========================
// Listar todos os pagamentos
// =========================
app.get('/v1/payments', async (req, res) => {
  const pagamentos = await prisma.payment.findMany();
  if (pagamentos.length === 0) {
    return res.status(200).json({ message: 'Nenhum pagamento registrado.' });
  }
  res.json(pagamentos);
});

// =========================
// Buscar pagamento por ID
// =========================
app.get('/v1/payments/:id', async (req, res) => {
  const pagamento = await prisma.payment.findUnique({
    where: { id: req.params.id }
  });
  if (!pagamento) return res.status(404).json({ message: 'Pagamento não encontrado.' });
  res.json(pagamento);
});

// =========================
// Criar pagamento
// =========================
app.post('/v1/payments', async (req, res) => {
  const { pedidoId, valor, status, meios } = req.body;

  if (!pedidoId || typeof valor !== 'number') {
    return res.status(400).json({ message: 'pedidoId e valor são obrigatórios.' });
  }

  const meiosValidos = Array.isArray(meios)
    ? meios.filter(m => METODOS_VALIDOS.includes(m))
    : [];

  if (meios && meios.length > 0 && meiosValidos.length === 0) {
    return res.status(400).json({ message: 'Nenhum método de pagamento válido fornecido.' });
  }

  const novo = await prisma.payment.create({
    data: {
      id: uuidv4(),
      pedidoId,
      valor,
      status: status || 'PENDENTE',
      meios: meiosValidos
    }
  });

  res.status(201).json(novo);
});

// =========================
// Deletar pagamento
// =========================
app.delete('/v1/payments/:id', async (req, res) => {
  const pagamento = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!pagamento) return res.status(404).json({ message: 'Pagamento não encontrado.' });

  await prisma.payment.delete({ where: { id: req.params.id } });
  res.status(200).json({ message: `Pagamento ${pagamento.id} removido com sucesso.`, pagamentoRemovido: pagamento });
});

// =========================
// Processar pagamento
// =========================
app.post('/v1/payments/:id/process', async (req, res) => {
  const pagamento = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!pagamento) return res.status(404).json({ message: 'Pagamento não encontrado.' });

  let { meios } = req.body;

  if (!Array.isArray(meios) || meios.length === 0) {
    meios = pagamento.meios.length > 0 ? pagamento.meios : [METODOS_VALIDOS[Math.floor(Math.random() * METODOS_VALIDOS.length)]];
  } else {
    meios = meios.filter(m => METODOS_VALIDOS.includes(m));
    if (meios.length === 0) return res.status(400).json({ message: 'Nenhum método de pagamento válido fornecido.' });
  }

  const sucesso = Math.random() < 0.7;

  try {
    const pedidoResp = await axios.get(`${process.env.ORDER_API_URL}/v1/pedidos/${pagamento.pedidoId}`);
    const pedido = pedidoResp.data;

    const resultados = meios.map(m => ({ meio: m, aprovou: sucesso }));

    const clienteResp = await axios.get(`${process.env.CLIENT_API_URL}/v1/clientes/${pedido.clienteId}`);
    const cliente = clienteResp.data;

    let statusFinal = sucesso ? 'PAGO' : 'FALHOU';

    await prisma.payment.update({
      where: { id: pagamento.id },
      data: { status: statusFinal, meios }
    });

    await axios.patch(`${process.env.ORDER_API_URL}/v1/pedidos/${pagamento.pedidoId}/status`, {
      status: sucesso ? 'PAGO' : 'CANCELADO'
    });

    await axios.post(`${process.env.NOTIFICATION_API_URL}/notify`, {
      user: cliente.email,
      message: sucesso
        ? `Pagamento do pedido ${pedido.id} aprovado!`
        : `Pagamento do pedido ${pedido.id} falhou. Pedido cancelado.`
    });

    res.status(sucesso ? 200 : 400).json({ pagamentoId: pagamento.id, status: statusFinal, resultados });

  } catch (err) {
    console.error('[Payments] erro:', err.message || err);
    res.status(500).json({ message: 'Erro interno no pagamento', error: err.message });
  }
});

// =========================
// Inicialização
// =========================
app.listen(PORT, () => console.log(`[Payments] rodando na porta ${PORT}`));
