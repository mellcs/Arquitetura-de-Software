require("dotenv").config();
const express = require("express");
const produtosRouter = require("./produtos");

const app = express();
app.use(express.json());

// routes
app.use("/products", produtosRouter);

const port = process.env.PORT || 3003;
app.listen(port, () => {
  console.log(`Products service running on port ${port}`);
});
