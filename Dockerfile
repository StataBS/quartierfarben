# Pin Node >=24.22.1 for CVE-2026-111497 (Brotli / Node2Shell).
FROM node:24.22.1-alpine AS build

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
ARG API_KEY_MAPBS=""
ENV API_KEY_MAPBS=${API_KEY_MAPBS}

RUN bun run build

# Stage 2 — Serve the static build (adapter-static → /app/build)
FROM node:24.22.1-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8020

RUN npm install -g serve@14.2.4
COPY --from=build /app/build ./build

# Host-generated vector tiles are mounted here at runtime.
VOLUME ["/app/build/tiles"]

EXPOSE 8020
CMD ["serve", "-s", "build", "-l", "8020"]
