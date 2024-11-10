# Use the official Node.js image as a base
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json into the working directory
COPY package*.json ./

# Install the dependencies inside the container
RUN npm install

# Copy the rest of your application code into the container
COPY . .

# Expose the port your app runs on (adjust if needed)
EXPOSE 3111

# Define the command to start the app
CMD ["node", "app.js"]
