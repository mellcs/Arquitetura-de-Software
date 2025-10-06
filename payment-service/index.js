const express = require('express');
const axios = require('./config/axios'); // axios com ORDER_API_URL default para order-service
const { v4: uuidv4 } = require('uuid');

const app = express();
const PREFIX = '/payment-service/v1';
const PORT = 3000;

app.use(express.json());

/**
 * POST /payment-service/v1/payments/:id/process
 * body: { meios: [{tipo, valor}], attemptId(optional) }
 *
 * Simula cada meio com Math.random(): sucesso se Math.random() > 0.25 (25% chance de falha)
 * Se todos aprovarem -> atualiza pedido para PAGO
 * Se algum falhar -> atualiza pedido para CANCELADO
 */

app.post(`${PREFIX}/payments/:id/process`, async (req, res) => {
  const pedidoId = req.params.id;
  const { meios } = req.body;
  if (!Array.isArray(meios) || meios.length === 0) return res.status(400).json({ message: 'meios é obrigatório' });

  console.log(`[Payments] Iniciando processamento pedido ${pedidoId}`);

  try {
    // buscar pedido para validar existência
    const pedidoResp = await axios.get(`/order-service/v1/pedidos/${pedidoId}`);
    const pedido = pedidoResp.data;

    // Simular pagamentos
    const resultados = meios.map(m => {
      const aprovou = Math.random() > 0.25; // 75% chance de aprovação
      return { meio: m, aprovou };
    });

    const todosAprovados = resultados.every(r => r.aprovou);

    // atualizar status do pedido via Order Service
    const novoStatus = todosAprovados ? 'PAGO' : 'CANCELADO';
    await axios.patch(`/order-service/v1/pedidos/${pedidoId}/status`, { status: novoStatus });

    // notificar cliente via client-service (se disponível)
    try {
      if (pedido.clienteId) {
        await axios.post(`http://client-service:3000/client-service/v1/clientes/${pedido.clienteId}/notify`, {
          message: todosAprovados ? `Pagamento confirmado para pedido ${pedidoId}` : `Pagamento falhou para pedido ${pedidoId}`
        });
      }
    } catch (notifyErr) {
      console.warn('[Payments] Falha ao notificar cliente:', notifyErr.message);
    }

    return res.json({
      pedidoId,
      aprovado: todosAprovados,
      resultados
    });

  } catch (err) {
    console.error('[Payments] erro:', err.message || err);
    return res.status(500).json({ message: 'Erro interno no pagamento', error: err.message });
  }
});

// Endpoint para listar métodos (simulado)
app.get(`${PREFIX}/payments/:id/metodos`, (req, res) => {
  // Simulação simples
  res.json([
    { tipo: 'cartao', bandeira: 'VISA' },
    { tipo: 'boleto' }
  ]);
});

app.listen(PORT, () => console.log(`[Payments] rodando na porta ${PORT}`));
