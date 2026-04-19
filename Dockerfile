FROM node:20-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1000

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --omit=dev

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

CMD ["node", "server/index.js"]