# Use official Node.js 20 runtime as a parent image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies for native modules
RUN apk add --no-cache python3 py3-setuptools make g++

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production \
 && npm rebuild sqlite3 --build-from-source

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Run the app
CMD ["node", "server.js"]