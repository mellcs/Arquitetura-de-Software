import axios from "axios";

const runSeed = async () => {
  try {
    const response = await axios.post("http://localhost:4005/notify", {
      user: "Jessika",
      message: "🎉 Serviço de Notificação testado com sucesso!"
    });

    console.log("✅ Resposta:", response.data);
  } catch (error) {
    console.error("❌ Erro ao enviar notificação:", error.message);
  }
};

runSeed();
