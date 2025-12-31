FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json
RUN npm install

FROM base AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM base AS final
WORKDIR /app
COPY --from=build /app/dist /app/
ENTRYPOINT ["node", "--enable-source-maps", "./dist/main.js"]