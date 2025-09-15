# ALLRENTZ Enterprise Platform - Multi-stage Docker Build
# Production-ready container with security hardening

# Stage 1: Build Environment
FROM node:18-alpine AS builder

# Install security updates and build dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache git python3 make g++ && \
    rm -rf /var/cache/apk/*

# Create non-root user for build process
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with security audit
RUN npm ci --only=production --audit && \
    npm cache clean --force

# Copy source code
COPY --chown=nextjs:nodejs . .

# Build application
RUN npm run build

# Stage 2: Production Environment
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Install serve for production serving
RUN npm install -g serve

# Create health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3000/health || exit 1' > /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh

# Security hardening
RUN chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD /app/healthcheck.sh

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["serve", "-s", "dist", "-l", "3000"]

# Metadata
LABEL maintainer="ALLRENTZ DevOps <devops@allrentz.com>" \
      version="1.0.0" \
      description="ALLRENTZ Enterprise Platform" \
      org.opencontainers.image.title="ALLRENTZ Enterprise Platform" \
      org.opencontainers.image.description="Industrial equipment rental platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="ALLRENTZ" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/allrentz/enterprise-platform"