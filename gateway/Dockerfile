FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV MESSENGER_GATEWAY_PORT=8787
ENV MESSENGER_GATEWAY_SESSIONS_DIR=/app/data/sessions

EXPOSE 8787

CMD ["node", "src/index.js"]
