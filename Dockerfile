# 블라인드 오목 — Next.js + Socket.IO custom server.
# Works on any container host (Render, Railway, Fly.io, Cloud Run, ...).
FROM node:22-slim

WORKDIR /app

# Install all deps (build needs the dev deps; tsx is a runtime dep).
COPY package*.json ./
RUN npm ci

# Build the Next.js app.
COPY . .
# NEXT_PUBLIC_* and prerendered metadata/sitemap/robots are baked at BUILD time.
# Railway passes matching service variables as Docker build args when declared ARG.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN npm run build

# The platform usually injects PORT; default to 3000 otherwise.
ENV PORT=3000
EXPOSE 3000

# `npm start` runs `NODE_ENV=production tsx server.ts` (Next + Socket.IO).
CMD ["npm", "start"]
