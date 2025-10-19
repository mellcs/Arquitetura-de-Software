import express from "express";

const app = express();
app.use(express.json());

// rota de notificação
app.post("/notify", (req, res) => {
  const { user, message } = req.body;

  if (!user || !message) {
    return res.status(400).send({ error: "Campos 'user' e 'message' são obrigatórios." });
  }

  console.log(`📢 Notificação enviada para ${user}: ${message}`);
  res.status(200).send({ status: "Notificação enviada com sucesso!" });
});

const PORT = process.env.PORT || 4005;
app.listen(PORT, () => console.log(`📨 Notification Service rodando na porta ${PORT}`));
