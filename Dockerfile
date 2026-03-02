FROM mcr.microsoft.com/playwright:v1.58.2-jammy AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Собираем фронтенд (Vite)
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.58.2-jammy AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY server ./server
COPY data ./data
COPY scripts ./scripts

EXPOSE 3001

CMD ["node", "server/index.js"]

