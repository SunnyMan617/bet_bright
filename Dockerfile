FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.server.json vite.config.ts ./
COPY server ./server
COPY shared ./shared
COPY web ./web
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8080 DATABASE_PATH=/app/data/betbridge.db
WORKDIR /app
RUN mkdir -p /app/data && chown node:node /app/data
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-server ./dist-server
USER node
EXPOSE 8080
CMD ["node", "dist-server/server/index.js"]
