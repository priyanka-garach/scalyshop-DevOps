FROM node:18

WORKDIR /app

# Copy package.json and package-lock.json (if any)
# COPY package*.json . /app
COPY ["package.json", "package-lock.json*", "./"]

RUN npm install

COPY . .
# Expose port 5045 inside the container
EXPOSE 5045

# Start the application
CMD ["npm", "start"]

