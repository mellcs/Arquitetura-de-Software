Loja Online – Arquitetura de Sistemas
Estrutura de Pastas

G2 AS/
├── prisma/
│   ├── migrations/        (Histórico das alterações no banco)
│   └── schema.prisma      (Definição do modelo de dados)
├── .env                   (Variáveis de ambiente)
├── docker-compose.yml     (Configuração do Postgres e PgAdmin)
├── lojinha.js             (Código da API)
└── .gitignore             (Arquivos ignorados no Git)

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

Como rodar

1. Subir containers:
   docker-compose up -d

2. Rodar migrations:
   npx prisma migrate dev --name init

3. Iniciar API:
   node lojinha.js

