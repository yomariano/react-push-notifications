# React Push Notifications with Node.js Server - Production Dockerfile
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies first (dev dependencies needed for build)
RUN npm install

# Copy source code
COPY . .

# Build the React application
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/subscriptions || exit 1

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start the Node.js server (serves React app + API)
CMD ["node", "server.js"]