# ============================================
# TeachPT - Multi-stage Dockerfile
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Accept build arguments for Vite environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO

# Create .env.production file for Vite build (Vite doesn't allow NODE_ENV=production in .env)
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env.production && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env.production && \
    echo "VITE_APP_TITLE=${VITE_APP_TITLE}" >> .env.production && \
    echo "VITE_APP_LOGO=${VITE_APP_LOGO}" >> .env.production

# Build the application
RUN pnpm run build

# ============================================
# Stage 2: Production
FROM node:20-alpine AS runner

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 teachpt

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install production dependencies only
RUN pnpm install --prod

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Set ownership
RUN chown -R teachpt:nodejs /app

# Switch to non-root user
USER teachpt

# Environment variables
ENV NODE_ENV=production
ENV PORT=1060

# Expose port
EXPOSE 1060

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:1060/api/trpc/system.health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
