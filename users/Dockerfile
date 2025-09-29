FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3004
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
