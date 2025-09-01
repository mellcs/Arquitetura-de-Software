Loja Online – Arquitetura de Sistemas
Estrutura de Pastas

<img width="485" height="184" alt="image" src="https://github.com/user-attachments/assets/5cb972a7-670e-4449-a29a-07b73c56db5d" />


docker-compose.yml

- Sobe dois containers:
  • postgres-db → Banco de dados PostgreSQL (porta 5432)
  • pgadmin → Interface web para gerenciar o banco (porta 5050)

.env
Contém a string de conexão com o banco:
DATABASE_URL="postgresql://postgres:naouseadmin@localhost:5432/ecommerce"
schema.prisma
Define os modelos do banco:

Products
- id (chave primária)
- name
- price
- stock

Orders
- id (chave primária)
- date
- total_value

Order_Product (tabela de ligação)
- id (chave primária)
- id_product (relacionado a Products)
- id_order (relacionado a Orders)
- quant
- unit_value
- total_value

migrations/
Scripts SQL gerados automaticamente pelo Prisma para criar/alterar tabelas.
lojinha.js

API em Node.js com endpoints para:
- Listar produtos
- Cadastrar produtos
- Criar pedidos (com verificação de estoque e cálculo de valores)



