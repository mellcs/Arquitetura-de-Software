require("dotenv").config();
const express = require("express");
const clientesRouter = require("./clientes");

const app = express();
app.use(express.json());

// routes
app.use("/clients", clientesRouter);

const port = process.env.PORT || 3004;
app.listen(port, () => {
  console.log(`Users service running on port ${port}`);
});
