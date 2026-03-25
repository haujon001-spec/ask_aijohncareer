# Multi-stage build - Frontend + Backend

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Backend runtime
FROM node:18-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package.json from root
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend code
COPY backend/ ./backend/
COPY src/data/john_profile.json ./src/data/

# Copy built frontend from stage 1
COPY --from=frontend-builder /build/dist ./dist

# Copy .env template (actual secrets come from runtime env vars)
COPY .env.example .env.example

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start backend (which also serves static frontend)
CMD ["node", "backend/server.js"]
