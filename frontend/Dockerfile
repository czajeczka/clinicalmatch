# syntax=docker/dockerfile:1

# ClinicalMatch frontend — React 19 + Vite 8 PWA served as static files.
# Multi-stage: build the production bundle, then serve it with nginx.

# --- Build stage -------------------------------------------------------------
FROM node:24-bookworm AS build
WORKDIR /app

# Install deps first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# VITE_API_URL is inlined into the bundle at BUILD time (Vite statically
# replaces import.meta.env.VITE_API_URL). It must be a URL the user's BROWSER
# can reach (e.g. https://czajka.aibr.cz or http://localhost:3001) — NOT the
# internal `backend` service name, which only resolves inside the Docker network.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# --- Production stage --------------------------------------------------------
# nginx serves the static dist/ output; nginx.conf adds SPA routing + PWA-aware
# cache headers.
FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
