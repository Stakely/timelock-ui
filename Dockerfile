# syntax=docker/dockerfile:1.7

# ─── Stage 1: build ─────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# WalletConnect Project ID is baked at build time (public identifier).
# Pass with: --build-arg VITE_WC_PROJECT_ID=<your-id>
# If empty, WalletConnect won't initialize but other wallets still work.
ARG VITE_WC_PROJECT_ID=""
ENV VITE_WC_PROJECT_ID=${VITE_WC_PROJECT_ID}

RUN npm run build

# ─── Stage 2: runtime ───────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

WORKDIR /app

# `serve` is a tiny static-file server with SPA fallback (-s)
RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
