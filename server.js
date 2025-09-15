const express = require("express");
const app = express();
app.use(express.json());

const produtosRouter = require("./routes/produtos");
const clientesRouter = require("./routes/clientes");
const pedidosRouter = require("./routes/pedidos");
const pagamentosRouter = require("./routes/pagamentos");

app.use("/produtos", produtosRouter);
app.use("/clientes", clientesRouter);
app.use("/pedidos", pedidosRouter);
app.use("/pedidos", pagamentosRouter);  // rotas de pagamento ficam como /pedidos/:id/pagamento

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
