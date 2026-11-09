FROM node:26.13.0-slim AS base
ENV CI=true
RUN npm install --global pnpm@11.28.9
WORKDIR /repo

FROM base AS web
COPY . .
RUN pnpm install --frozen-lockfile --filter "@boberstack/web..."
RUN pnpm --filter @boberstack/web run build

FROM base AS api
COPY . .
RUN pnpm install --frozen-lockfile --prod --filter "@boberstack/api..."
COPY --from=web /repo/apps/web/dist /repo/apps/web/dist
ENV NODE_ENV=production PORT=3000 WEB_ROOT=/repo/apps/web/dist
EXPOSE 3000
USER node
WORKDIR /repo/apps/api
CMD ["node", "src/server.ts"]
