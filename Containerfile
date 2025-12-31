FROM node:25-alpine AS base
WORKDIR /app
COPY --link package.json package-lock.json
RUN npm install

FROM base AS build
WORKDIR /app
COPY --link . .
RUN npm run build

FROM base AS final
WORKDIR /app
COPY --from=build /app/dist /app/
ENTRYPOINT ["node", "--enable-source-maps", "./dist/main.js"]