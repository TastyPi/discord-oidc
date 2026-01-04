FROM node:24-alpine3.22 AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM base AS final
WORKDIR /app
RUN npm ci --omit=dev
COPY --from=build /app/dist /app/dist/
ENTRYPOINT ["node", "--enable-source-maps", "./dist/main.js"]
