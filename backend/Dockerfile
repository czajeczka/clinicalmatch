# syntax=docker/dockerfile:1

# ClinicalMatch backend — Express 5 + TypeScript (ESM), SQLite via better-sqlite3.
# Multi-stage: a full Node image compiles TypeScript (and the native
# better-sqlite3 binary), then a slim runtime image runs the built server.

# --- Build stage -------------------------------------------------------------
# The full node:24 image ships a C/C++ toolchain + python, which better-sqlite3
# needs if a prebuilt binary isn't available for this platform.
FROM node:24-bookworm AS build
WORKDIR /app

# Install deps first so this layer is cached unless the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

# Compile TypeScript to dist/ (the build script also copies schema.sql into
# dist/db/, which the app reads at startup to apply the schema).
COPY . .
RUN npm run build

# Drop devDependencies but keep the already-compiled better-sqlite3 binary,
# so we can copy a lean, production-only node_modules into the runtime image.
RUN npm prune --omit=dev

# --- Production stage --------------------------------------------------------
# Same Debian base (bookworm) as the build stage, so the native better-sqlite3
# binary stays ABI-compatible. Slim variant has no build toolchain.
FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

# Bring over the production node_modules (with the native binary) and the build.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# DB_PATH defaults to data/clinicalmatch.sqlite; a compose volume mounts here to
# persist the SQLite file across restarts. Owned by the non-root `node` user so
# the app can write to it (a fresh named volume inherits this ownership).
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

# Documentation only — the real port comes from PORT (config.ts default 3001).
# Keep PORT=3001 in .env or update the compose port mapping to match.
EXPOSE 3001

CMD ["node", "dist/index.js"]
