// payment-service/seed.js
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'payments-db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASS || 'admin',
  database: process.env.DB_NAME || 'admin',
  port: 5432,
});

async function seed() {
  try {
    await client.connect();
    console.log('Conectado ao banco de pagamentos.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL,
        method VARCHAR(50),
        amount DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tabela payments criada (ou já existente).');
  } catch (err) {
    console.error('Erro no seed de payments:', err);
  } finally {
    await client.end();
    console.log('Seed finalizado.');
  }
}

seed();
