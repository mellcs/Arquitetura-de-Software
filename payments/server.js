require("dotenv").config();
const express = require("express");
const pagamentosRouter = require("./pagamentos");

const app = express();
app.use(express.json());

// routes
app.use("/pagamentos", pagamentosRouter);

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`Payments service running on port ${port}`);
});
