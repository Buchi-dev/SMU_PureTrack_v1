# Use an official lightweight Node runtime as a parent image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package metadata and install only production deps
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Use environment variables where appropriate
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Start the application
CMD ["node", "src/index.js"]
