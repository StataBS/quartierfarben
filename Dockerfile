# Pin Node >=24.22.1 for CVE-2026-111497 (Brotli / Node2Shell).
FROM node:24.22.2-alpine AS build

RUN apk add --no-cache git ca-certificates && update-ca-certificates
# Pin Bun >=1.4.4 for the same Brotli decoder CVE.
RUN npm install -g bun@1.4.4

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN bun install --ci

COPY . .

# BASE_PATH controls where the app is served (e.g. "/quartierfarben" or "").
ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}

RUN bun run build

# Stage 2 — Static files plus the search proxy (adapter-static → /app/build).
# API_KEY_MAPBS is read from the container environment and is not part of the image.
FROM node:24.22.2-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8020

COPY --from=build /app/build ./build
COPY server ./server

# Host-generated vector tiles are mounted here at runtime.
VOLUME ["/app/build/tiles"]

EXPOSE 8020
# Missing /tiles/*.pbf must stay a 404. Rewriting them to index.html makes
# MapLibre fail with "Unimplemented type: 4" while parsing HTML as MVT.
CMD ["node", "server/index.mjs"]
