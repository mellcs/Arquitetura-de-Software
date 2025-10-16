const express = require('express');
const axios = require('./config/axios'); // axios com ORDER_API_URL default para order-service
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

app.use(express.json());

// banco de pagamentos em memória
let pagamentos = [];

// formas de pagamento disponíveis
const METODOS_VALIDOS = ['cartao_credito', 'debito', 'pix', 'dinheiro'];

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
  const { id, pedidoId, valor, status, meios } = req.body;

  if (!pedidoId || typeof valor !== 'number') {
    return res.status(400).json({ message: 'pedidoId e valor são obrigatórios.' });
  }

  // valida métodos passados
  let meiosValidos = [];
  if (Array.isArray(meios) && meios.length > 0) {
    meiosValidos = meios.filter(m => METODOS_VALIDOS.includes(m));
    if (meiosValidos.length === 0) {
      return res.status(400).json({ message: 'Nenhum método de pagamento válido fornecido.' });
    }
  }

  const novo = {
    id: id || uuidv4(),
    pedidoId,
    valor,
    status: status || 'PENDENTE',
    meios: meiosValidos.length > 0 ? meiosValidos : undefined
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
//  Processar pagamento (70% de chance de sucesso)
// =========================
app.post('/v1/payments/:id/process', async (req, res) => {
  const pagamento = pagamentos.find(p => p.id === req.params.id);
  if (!pagamento) return res.status(404).json({ message: 'Pagamento não encontrado.' });

  let { meios } = req.body;

  // se não vier métodos, usa os definidos no pagamento ou escolhe aleatórios
  if (!Array.isArray(meios) || meios.length === 0) {
    if (Array.isArray(pagamento.meios) && pagamento.meios.length > 0) {
      meios = pagamento.meios;
    } else {
      // sorteia 1 a 2 métodos aleatórios
      const qtd = Math.floor(Math.random() * 2) + 1;
      meios = [];
      while (meios.length < qtd) {
        const escolhido = METODOS_VALIDOS[Math.floor(Math.random() * METODOS_VALIDOS.length)];
        if (!meios.includes(escolhido)) meios.push(escolhido);
      }
    }
  } else {
    // filtra apenas métodos válidos
    meios = meios.filter(m => METODOS_VALIDOS.includes(m));
    if (meios.length === 0) return res.status(400).json({ message: 'Nenhum método de pagamento válido fornecido.' });
  }

  // definir sucesso com 70% de chance
  const sucesso = Math.random() < 0.7;

  console.log(`[Payments] Processando pagamento ${pagamento.id} com métodos: ${meios.join(', ')}...`);

  try {
    // buscar pedido para validar existência
    const pedidoResp = await axios.get(`/order-service/v1/pedidos/${pagamento.pedidoId}`);
    const pedido = pedidoResp.data;

    const resultados = meios.map(m => ({ meio: m, aprovou: sucesso }));

    if (sucesso) {
      // atualizar status do pedido via Order Service
      await axios.patch(`/order-service/v1/pedidos/${pagamento.pedidoId}/status`, { status: 'PAGO' });

      // atualizar status local
      pagamento.status = 'PAGO';
      pagamento.resultados = resultados;

      // notificação simples no console
      console.log(`NOTIFICAÇÃO: O pagamento do pedido de ${pedido.clienteNome || 'Cliente'} foi confirmado ✅`);

      return res.json({
        pagamentoId: pagamento.id,
        status: pagamento.status,
        resultados
      });

    } else {
      // pagamento falhou
      pagamento.status = 'FALHOU';
      pagamento.resultados = resultados;
      console.log(`[Payments] Pagamento ${pagamento.id} FALHOU ❌`);

      // avisar Order Service para cancelar pedido e devolver estoque
      try {
        await axios.patch(`/order-service/v1/pedidos/${pagamento.pedidoId}/status`, { status: 'CANCELADO' });
        console.log(`[Payments] Pedido ${pagamento.pedidoId} marcado como CANCELADO no Order Service`);
      } catch (err) {
        console.error('[Payments] Falha ao cancelar pedido no Order Service:', err.message || err);
      }

      return res.status(400).json({
        pagamentoId: pagamento.id,
        status: pagamento.status,
        resultados
      });
    }

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
