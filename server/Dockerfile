# ============================================
# STAGE 1: Dependencies
# ============================================
FROM node:18-alpine AS dependencies

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    wget \
    curl

# Create app directory
WORKDIR /app

# Copy only package files for better layer caching
COPY server/package.json server/package-lock.json ./

# Install production dependencies with optimizations
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================
# STAGE 2: Production Image
# ============================================
FROM node:18-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache \
    wget \
    curl \
    tini \
    dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create app directory with proper permissions
WORKDIR /app

# Copy node_modules from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application source
COPY --chown=nodejs:nodejs server/ .

# Create directories with proper permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs logs && \
    chmod 755 logs

# Set environment variables
ENV NODE_ENV=production \
    PORT=5000 \
    NPM_CONFIG_LOGLEVEL=warn

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check at build time
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "src/index.js"]
