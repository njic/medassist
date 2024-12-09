# Use a build argument for selecting the Node.js base image
ARG TARGETARCH
ARG TARGETVARIANT

# Default to Alpine for amd64 and arm64
FROM node:lts-alpine AS amd64
FROM node:lts-alpine AS arm64

# Use full Node.js image for armv7
FROM node:lts AS armv7

# Use the correct base image based on architecture
FROM ${TARGETARCH}${TARGETVARIANT:+${TARGETVARIANT}} AS final

# Set the environment to production
ENV NODE_ENV=production

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json into the working directory
COPY package*.json ./

# Install dependencies inside the container
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 3111

# Define the command to start the app
CMD ["node", "app.js"]