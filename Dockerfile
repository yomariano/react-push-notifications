# React Push Notifications with Node.js Server - Production Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including production ones for the server)
RUN npm ci

# Copy source code
COPY . .

# Build the React application
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm ci --only=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start the Node.js server (serves React app + API)
CMD ["npm", "run", "server"]