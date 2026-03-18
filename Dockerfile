FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN npm run build

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

CMD ["node", "server/index.js"]