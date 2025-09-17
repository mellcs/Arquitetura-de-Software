require("dotenv").config();
const express = require("express");
const pedidosRouter = require("./pedidos");

const app = express();
app.use(express.json());

// routes
app.use("/pedidos", pedidosRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Orders service running on port ${port}`);
});
