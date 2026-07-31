# syntax=docker/dockerfile:1.7

# ─── Stage 1: build ─────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Activate the pnpm version pinned by `packageManager` in package.json.
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# WalletConnect Project ID is baked at build time (public identifier).
# Pass with: --build-arg VITE_WC_PROJECT_ID=<your-id>
# Optional: if empty, the WalletConnect option is hidden in the wallet modal
# but extension wallets (MetaMask, Coinbase, Rainbow) keep working.
ARG VITE_WC_PROJECT_ID=""
ENV VITE_WC_PROJECT_ID=${VITE_WC_PROJECT_ID}

ARG VITE_ENABLE_ANALYTICS=""
ENV VITE_ENABLE_ANALYTICS=${VITE_ENABLE_ANALYTICS}

ARG VITE_UMAMI_PROJECT_ID=""
ENV VITE_UMAMI_PROJECT_ID=${VITE_UMAMI_PROJECT_ID}

ARG VITE_UMAMI_URL=""
ENV VITE_UMAMI_URL=${VITE_UMAMI_URL}

RUN pnpm build

# ─── Stage 2: runtime ───────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

WORKDIR /app

# `serve` is a tiny static-file server with SPA fallback (-s)
RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
