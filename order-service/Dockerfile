FROM node:18-alpine

# criar grupo/usuário não-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

COPY package*.json ./

ENV NODE_ENV=production
RUN npm ci --only=production

COPY --chown=appuser:appgroup . .

EXPOSE 3000

USER appuser

CMD ["node", "index.js"]
