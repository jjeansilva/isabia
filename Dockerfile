# Multi-stage Dockerfile for Next.js standalone runtime
# Build with Node 22 LTS and run with a minimal image

# ---- deps ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- builder ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build standalone output
RUN npm run build

# ---- runner ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Use standard PATH (no NIXPACKS_PATH)
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
# Copy standalone server and public assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
# Default port (platform will set $PORT)
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]