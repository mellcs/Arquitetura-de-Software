import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:4005", // endereço base do serviço de notificação
  timeout: 5000
});
