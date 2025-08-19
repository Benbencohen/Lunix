# Use an official Node.js runtime as a parent image
# Using the Bullseye version as it's stable and has needed build tools
FROM node:18-bullseye

# Set the working directory in the container
WORKDIR /usr/src/app

# Install system dependencies required by node-pty
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application's source code
COPY . .

# Make port available to the world outside this container
EXPOSE 10000

# Define environment variable, Render will override this
ENV PORT 10000

# Run the app when the container launches
CMD [ "node", "server.js" ]
