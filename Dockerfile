# ── Stage 1: dependency install ──────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first → layer is cached until package*.json changes
COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts


# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Run as least-privilege built-in user
USER node

# Pull in only the production node_modules from the deps stage
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy application source (assumes .dockerignore excludes noise)
COPY --chown=node:node . .

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "\
    fetch('http://127.0.0.1:5000/api/health')\
      .then(async r => { const d = await r.json(); process.exit(r.ok && d?.success && d?.api === 'healthy' ? 0 : 1); })\
      .catch(() => process.exit(1));"

CMD ["node", "server.js"]