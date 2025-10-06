const express = require('express');
const axios = require('./config/axios'); // axios com ORDER_API_URL default para order-service
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

app.use(express.json());

// banco de pagamentos em memória
let pagamentos = [];

// =========================
//  Listar todos os pagamentos
// =========================
app.get('/v1/payments', (req, res) => {
  if (pagamentos.length === 0) {
    return res.status(200).json({ message: 'Nenhum pagamento registrado.' });
  }
  res.json(pagamentos);
});

// =========================
//  Buscar pagamento por ID
// =========================
app.get('/v1/payments/:id', (req, res) => {
  const pagamento = pagamentos.find(p => p.id === req.params.id);
  if (!pagamento) return res.status(404).json({ message: 'Pagamento não encontrado.' });
  res.json(pagamento);
});

// =========================
//  Criar pagamento
// =========================
app.post('/v1/payments', (req, res) => {
  const { id, pedidoId, valor, status } = req.body;

  if (!pedidoId || typeof valor !== 'number') {
    return res.status(400).json({ message: 'pedidoId e valor são obrigatórios.' });
  }

  const novo = {
    id: id || uuidv4(),
    pedidoId,
    valor,
    status: status || 'PENDENTE'
  };

  pagamentos.push(novo);
  res.status(201).json(novo);
});

// =========================
//  Deletar pagamento
// =========================
app.delete('/v1/payments/:id', (req, res) => {
  const index = pagamentos.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Pagamento não encontrado.' });

  const removido = pagamentos.splice(index, 1)[0];
  res.status(200).json({
    message: `Pagamento ${removido.id} removido com sucesso.`,
    pagamentoRemovido: removido
  });
});

// =========================
//  Processar pagamento (sempre aprovado)
// =========================
app.post('/v1/payments/:id/process', async (req, res) => {
  const pagamento = pagamentos.find(p => p.id === req.params.id);
  if (!pagamento) return res.status(404).json({ message: 'Pagamento não encontrado.' });

  const { meios } = req.body;
  if (!Array.isArray(meios) || meios.length === 0) return res.status(400).json({ message: 'meios é obrigatório' });

  console.log(`[Payments] Processando pagamento ${pagamento.id} como PAGO`);

  try {
    // buscar pedido para validar existência
    const pedidoResp = await axios.get(`/order-service/v1/pedidos/${pagamento.pedidoId}`);
    const pedido = pedidoResp.data;

    // marca todos os meios como aprovados
    const resultados = meios.map(m => ({ meio: m, aprovou: true }));

    // atualizar status do pedido via Order Service
    await axios.patch(`/order-service/v1/pedidos/${pagamento.pedidoId}/status`, { status: 'PAGO' });

    // atualizar status local do pagamento
    pagamento.status = 'PAGO';
    pagamento.resultados = resultados;

    // notificar cliente via client-service (se disponível)
    try {
      if (pedido.clienteId) {
        await axios.post(`http://client-service:3000/v1/clientes/${pedido.clienteId}/notify`, {
          message: `Pagamento confirmado para pedido ${pedido.id}`
        });
      }
    } catch (notifyErr) {
      console.warn('[Payments] Falha ao notificar cliente:', notifyErr.message);
    }

    return res.json({
      pagamentoId: pagamento.id,
      status: pagamento.status,
      resultados
    });

  } catch (err) {
    console.error('[Payments] erro:', err.message || err);
    return res.status(500).json({ message: 'Erro interno no pagamento', error: err.message });
  }
});

// =========================
//  Marcar pagamento manualmente como PAGO
// =========================
app.patch('/v1/payments/:id', (req, res) => {
  const pagamento = pagamentos.find(p => p.id === req.params.id);
  if (!pagamento) return res.status(404).json({ message: 'Pagamento não encontrado.' });

  pagamento.status = 'PAGO';

  res.json({
    pagamentoId: pagamento.id,
    status: pagamento.status
  });
});

// =========================
//  Inicialização
// =========================
app.listen(PORT, () => console.log(`[Payments] rodando na porta ${PORT}`));
